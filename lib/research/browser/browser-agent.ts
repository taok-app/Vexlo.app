import { nanoid } from 'nanoid'
import { SearchAgent as ExistingSearchAgent } from '@/lib/agents/search/agent'
import type { SearchResult } from '@/lib/agents/search/types'
import { createLogger } from '@/lib/logging'
import { TtlCache } from './cache'
import { extractPage, scoreSourceQuality } from './extractor'
import { ExistingBrowserFetcher } from './fetcher'
import { normalizeSourceUrl } from './normalizer'
import { RobotsTxtPolicy } from './robots'
import {
  BrowserAgentErrorCode,
  ResearchBrowserError,
  type BrowserAgentDependencies,
  type BrowserAgentErrorInfo,
  type BrowserAgentOptions,
  type BrowserRunResult,
  type BrowserTaskResult,
  type ResearchSearchExecutor,
  type RetrievedSource,
  type SearchTask,
} from './types'
import { validateRawDocument, validateRetrievedSource, validateSearchTask, validateUrl } from './validator'

const logger = createLogger('research-browser-agent')
const DEFAULTS: Required<BrowserAgentOptions> = {
  resultsPerTask: 8,
  maxSourcesPerTask: 4,
  concurrency: 3,
  timeoutMs: 30_000,
  cacheTtlMs: 60 * 60 * 1_000,
  respectRobots: true,
  userAgent: 'VexloBrowser',
}

class ExistingSearchExecutor implements ResearchSearchExecutor {
  constructor(private readonly agent = new ExistingSearchAgent()) {}

  search(query: { query: string; limit?: number; language?: string }): Promise<{ results: SearchResult[] }> {
    return this.agent.search(query)
  }
}

export class ResearchBrowserAgent {
  private readonly options: Required<BrowserAgentOptions>
  private readonly dependencies: Required<BrowserAgentDependencies>

  constructor(dependencies: Partial<BrowserAgentDependencies> = {}, options: BrowserAgentOptions = {}) {
    const fetcher = dependencies.fetcher ?? new ExistingBrowserFetcher()
    this.options = { ...DEFAULTS, ...options }
    this.dependencies = {
      search: dependencies.search ?? new ExistingSearchExecutor(),
      fetcher,
      robots: dependencies.robots ?? new RobotsTxtPolicy(fetcher),
      cache: dependencies.cache ?? new TtlCache({ defaultTtlMs: this.options.cacheTtlMs }),
    }
  }

  async execute(tasks: SearchTask[], options: BrowserAgentOptions = {}): Promise<BrowserRunResult> {
    const startedAt = performance.now()
    const settings = { ...this.options, ...options }
    const ordered = [...tasks].sort(
      (left, right) => right.expectedUsefulness - left.expectedUsefulness || right.confidence - left.confidence,
    )
    const results: BrowserTaskResult[] = []
    for (const batch of chunk(ordered, settings.concurrency)) {
      results.push(...(await Promise.all(batch.map((task) => this.executeTask(task, settings)))))
    }
    const sources = deduplicateSources(results.flatMap((result) => result.sources))
    const errors = results.flatMap((result) => result.errors)
    const metadata = {
      durationMs: Math.round(performance.now() - startedAt),
      tasksExecuted: results.length,
      urlsConsidered: results.reduce((sum, result) => sum + result.sources.length + result.errors.length, 0),
      sourcesRetrieved: sources.length,
      cacheHits: sources.filter((source) => source.metadata['vexlo:cache'] === 'hit').length,
      robotsDenied: errors.filter((error) => error.code === BrowserAgentErrorCode.ROBOTS_DENIED).length,
      failures: errors.length,
    }
    logger.info('Browser tasks completed', metadata)
    return { results, sources, metadata }
  }

  private async executeTask(task: SearchTask, options: Required<BrowserAgentOptions>): Promise<BrowserTaskResult> {
    const startedAt = performance.now()
    const validation = validateSearchTask(task)
    if (!validation.valid) {
      return {
        taskId: task.id,
        query: task.query,
        sources: [],
        errors: validation.errors.map((issue) => ({
          code: BrowserAgentErrorCode.INVALID_TASK,
          message: issue.message,
          taskId: task.id,
          retryable: false,
        })),
        durationMs: Math.round(performance.now() - startedAt),
      }
    }

    try {
      const response = await this.dependencies.search.search({
        query: task.query,
        limit: options.resultsPerTask,
        language: task.language,
      })
      const candidates = uniqueResults(response.results).slice(0, options.resultsPerTask)
      const outcomes: Array<RetrievedSource | BrowserAgentErrorInfo> = []
      for (const batch of chunk(candidates, options.concurrency)) {
        outcomes.push(...(await Promise.all(batch.map((result, index) => this.retrieve(task, result, index, options)))))
        if (outcomes.filter(isRetrievedSource).length >= options.maxSourcesPerTask) break
      }
      return {
        taskId: task.id,
        query: task.query,
        sources: outcomes.filter(isRetrievedSource).slice(0, options.maxSourcesPerTask),
        errors: outcomes.filter(isBrowserError),
        durationMs: Math.round(performance.now() - startedAt),
      }
    } catch (error) {
      return {
        taskId: task.id,
        query: task.query,
        sources: [],
        errors: [toErrorInfo(error, task.id)],
        durationMs: Math.round(performance.now() - startedAt),
      }
    }
  }

  private async retrieve(
    task: SearchTask,
    result: SearchResult,
    searchRank: number,
    options: Required<BrowserAgentOptions>,
  ): Promise<RetrievedSource | BrowserAgentErrorInfo> {
    const normalizedUrl = normalizeSourceUrl(result.url)
    if (!normalizedUrl || !validateUrl(normalizedUrl).valid) {
      return toErrorInfo(
        new ResearchBrowserError(BrowserAgentErrorCode.INVALID_URL, 'Search result URL is invalid'),
        task.id,
        result.url,
      )
    }
    const cached = this.dependencies.cache.get(normalizedUrl)
    if (cached) {
      logger.debug('Browser source cache hit', { taskId: task.id, url: normalizedUrl })
      return { ...cached, taskId: task.id, query: task.query, metadata: { ...cached.metadata, 'vexlo:cache': 'hit' } }
    }

    try {
      if (options.respectRobots && !(await this.dependencies.robots.isAllowed(normalizedUrl, options.userAgent))) {
        throw new ResearchBrowserError(BrowserAgentErrorCode.ROBOTS_DENIED, 'Source is disallowed by robots.txt')
      }
      const fetchStartedAt = performance.now()
      const document = await this.dependencies.fetcher.fetch(normalizedUrl, { timeoutMs: options.timeoutMs })
      logger.debug('Source fetched', {
        taskId: task.id,
        url: normalizedUrl,
        durationMs: Math.round(performance.now() - fetchStartedAt),
      })
      const rawValidation = validateRawDocument(document)
      if (!rawValidation.valid) {
        throw new ResearchBrowserError(
          rawValidation.errors[0]?.code === 'OVERSIZED_RESPONSE'
            ? BrowserAgentErrorCode.OVERSIZED_RESPONSE
            : BrowserAgentErrorCode.UNSUPPORTED_CONTENT,
          rawValidation.errors[0]?.message ?? 'Invalid browser response',
        )
      }
      const extractionStartedAt = performance.now()
      const page = extractPage(document)
      logger.debug('Source extracted', {
        taskId: task.id,
        url: normalizedUrl,
        durationMs: Math.round(performance.now() - extractionStartedAt),
      })
      const finalUrl = page.canonicalUrl ?? normalizeSourceUrl(document.finalUrl) ?? normalizedUrl
      const source: RetrievedSource = {
        ...page,
        id: `source_${nanoid(12)}`,
        taskId: task.id,
        query: task.query,
        url: finalUrl,
        originalUrl: result.url,
        domain: new URL(finalUrl).hostname,
        fetchedAt: document.fetchedAt,
        contentType: document.contentType,
        contentSizeBytes: document.responseSize,
        searchRank,
        searchScore: Math.max(0, Math.min(1, result.rankingScore)),
        quality: scoreSourceQuality(page, finalUrl, document.fetchedAt),
      }
      const sourceValidation = validateRetrievedSource(source)
      if (!sourceValidation.valid) {
        throw new ResearchBrowserError(
          BrowserAgentErrorCode.EMPTY_CONTENT,
          sourceValidation.errors[0]?.message ?? 'Extracted source is invalid',
        )
      }
      this.dependencies.cache.set(normalizedUrl, source, options.cacheTtlMs)
      return source
    } catch (error) {
      return toErrorInfo(error, task.id, normalizedUrl)
    }
  }
}

function uniqueResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  return results.filter((result) => {
    const key = normalizeSourceUrl(result.url)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function deduplicateSources(sources: RetrievedSource[]): RetrievedSource[] {
  const seen = new Set<string>()
  return sources.filter((source) => {
    const key = normalizeSourceUrl(source.url) ?? source.url
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function chunk<T>(values: T[], size: number): T[][] {
  const safeSize = Math.max(1, Math.floor(size))
  const output: T[][] = []
  for (let index = 0; index < values.length; index += safeSize) output.push(values.slice(index, index + safeSize))
  return output
}

function isRetrievedSource(value: RetrievedSource | BrowserAgentErrorInfo): value is RetrievedSource {
  return 'quality' in value
}

function isBrowserError(value: RetrievedSource | BrowserAgentErrorInfo): value is BrowserAgentErrorInfo {
  return 'code' in value
}

function toErrorInfo(error: unknown, taskId?: string, url?: string): BrowserAgentErrorInfo {
  if (error instanceof ResearchBrowserError) {
    return { code: error.code, message: error.message, retryable: error.retryable, taskId, url }
  }
  const value = error instanceof Error ? error : new Error('Unknown browser failure')
  const code = 'code' in value && typeof value.code === 'string' ? value.code : ''
  return {
    code:
      code === 'UNSUPPORTED_CONTENT'
        ? BrowserAgentErrorCode.UNSUPPORTED_CONTENT
        : code === 'VALIDATION_ERROR'
          ? BrowserAgentErrorCode.INVALID_URL
          : BrowserAgentErrorCode.FETCH_FAILED,
    message: value.message || 'Source retrieval failed',
    retryable: 'retryable' in value && value.retryable === true,
    taskId,
    url,
  }
}

export { ExistingSearchExecutor }
export const BrowserAgent = ResearchBrowserAgent
