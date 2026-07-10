/**
 * Browser Agent
 * 
 * Production-ready BrowserAgent that orchestrates content extraction.
 * Implements the complete browser pipeline with proper isolation and extensibility.
 */

import type {
  BrowserRequest,
  BrowserResponse,
  PageContent,
  BrowserStatistics,
  BrowserExecutionContext,
} from './types'
import { getBrowserRegistry } from './registry'
import { getBrowserFactory } from './factory'
import { getBrowserSelector, BrowserSelectionStrategy } from './selector'
import { getBrowserCache } from './cache'
import { chunkDocument } from './chunking'
import { browserTelemetry } from './telemetry'
import { generateBrowserId, generateBrowserRequestId, measureTime, normalizeUrl } from './utils'
import {
  DEFAULT_BROWSER_TIMEOUT_MS,
  MAX_CONCURRENT_BROWSER_REQUESTS,
} from './constants'
import {
  BrowserTimeoutError,
  BrowserProviderUnavailableError,
  InvalidUrlError,
} from './errors'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:agent')

/**
 * Base BrowserAgent implementation
 */
export class BrowserAgent {
  private registry = getBrowserRegistry()
  private factory = getBrowserFactory()
  private selector = getBrowserSelector()
  private cache = getBrowserCache()

  /**
   * Fetch and extract page content
   */
  async fetch(
    url: string,
    context?: Partial<BrowserExecutionContext>,
  ): Promise<BrowserResponse> {
    const browserId = generateBrowserId()
    const executionContext = this.buildExecutionContext(browserId, context)

    try {
      // Validate URL
      this.validateUrl(url)

      logger.info('Browser fetch started', {
        browserId,
        url,
      })

      browserTelemetry.fetchStarted('unknown', url)

      // Check cache first
      const cached = this.cache.get(url)
      if (cached) {
        logger.debug('Browser cache hit', { url })
        return this.buildResponse(
          browserId,
          url,
          cached,
          true,
          executionContext,
        )
      }

      // Execute fetch pipeline
      const response = await this.executePipeline(url, executionContext)

      logger.info('Browser fetch completed', {
        browserId,
        url,
        chunkCount: response.chunks.length,
        duration: response.statistics.totalDurationMs,
      })

      return response
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Browser fetch failed', {
        browserId,
        url,
        error: err.message,
      })

      browserTelemetry.browserError(err)

      throw err
    }
  }

  /**
   * Execute the complete browser pipeline
   */
  private async executePipeline(
    url: string,
    context: BrowserExecutionContext,
  ): Promise<BrowserResponse> {
    const startTime = performance.now()

    // Step 1: Select providers
    const selectedProviders = this.selector.selectProviders(url, {
      strategy: BrowserSelectionStrategy.AUTO,
    })

    if (selectedProviders.length === 0) {
      throw new BrowserProviderUnavailableError('unknown')
    }

    logger.debug('Browser providers selected', {
      count: selectedProviders.length,
      providers: selectedProviders,
    })

    // Step 2: Execute providers in parallel
    const executionStart = performance.now()
    const results = await this.executeProvidersParallel(
      selectedProviders,
      url,
      context,
    )
    const executionDuration = performance.now() - executionStart

    if (results.length === 0) {
      throw new Error('No providers returned content')
    }

    // Use first successful result
    const pageContent = results[0]

    // Step 3: Generate chunks
    const chunkingStart = performance.now()
    const chunks = chunkDocument(pageContent.content, url, pageContent.metadata)
    const chunkingDuration = performance.now() - chunkingStart

    const totalDuration = performance.now() - startTime

    // Cache the result
    this.cache.set(url, pageContent)

    // Build response
    return this.buildResponse(
      context.executionId,
      url,
      pageContent,
      false,
      context,
      {
        totalDurationMs: Math.round(totalDuration),
        fetchDurationMs: Math.round(executionDuration),
        extractionDurationMs: Math.round(executionDuration),
        markdownDurationMs: 0,
        chunkingDurationMs: Math.round(chunkingDuration),
        chunkCount: chunks.length,
        contentSizeBytes: pageContent.content.length,
        isDuplicate: false,
      },
      chunks,
    )
  }

  /**
   * Execute multiple providers in parallel
   */
  private async executeProvidersParallel(
    providerIds: string[],
    url: string,
    context: BrowserExecutionContext,
  ): Promise<PageContent[]> {
    // Limit concurrent executions
    const chunks = this.chunkProviders(
      providerIds,
      MAX_CONCURRENT_BROWSER_REQUESTS,
    )
    const allResults: PageContent[] = []

    for (const chunk of chunks) {
      const promises = chunk.map((providerId) =>
        this.executeProvider(providerId, url, context).catch((error) => {
          logger.warn('Browser provider failed', {
            provider: providerId,
            error: error instanceof Error ? error.message : String(error),
          })
          return null
        }),
      )

      const chunkResults = await Promise.all(promises)
      const validResults = chunkResults.filter(
        (result): result is PageContent => result !== null,
      )
      allResults.push(...validResults)

      // Stop if we have a result
      if (allResults.length > 0) break
    }

    return allResults
  }

  /**
   * Execute a single provider
   */
  private async executeProvider(
    providerId: string,
    url: string,
    context: BrowserExecutionContext,
  ): Promise<PageContent> {
    const provider = this.registry.resolve(providerId)

    const request: BrowserRequest = {
      requestId: generateBrowserRequestId(),
      url,
      timeoutMs: context.timeoutMs ?? DEFAULT_BROWSER_TIMEOUT_MS,
      provider: providerId,
    }

    const { result: content, durationMs } = await measureTime(() =>
      Promise.race([
        provider.fetch(request),
        new Promise<PageContent>((_, reject) =>
          setTimeout(
            () => reject(new BrowserTimeoutError(request.timeoutMs)),
            request.timeoutMs,
          ),
        ),
      ]),
    )

    browserTelemetry.fetchCompleted(providerId, durationMs, content.content.length)

    logger.debug('Browser provider executed successfully', {
      provider: providerId,
      contentSize: content.content.length,
      durationMs,
    })

    return content
  }

  /**
   * Validate URL
   */
  private validateUrl(url: string): void {
    if (!url || url.trim().length === 0) {
      throw new InvalidUrlError('URL cannot be empty')
    }

    try {
      new URL(url)
    } catch {
      throw new InvalidUrlError(url)
    }
  }

  /**
   * Build execution context
   */
  private buildExecutionContext(
    browserId: string,
    partial?: Partial<BrowserExecutionContext>,
  ): BrowserExecutionContext {
    return {
      executionId: browserId,
      organizationId: partial?.organizationId ?? 'default',
      userId: partial?.userId,
      timeoutMs: partial?.timeoutMs ?? DEFAULT_BROWSER_TIMEOUT_MS,
      context: partial?.context,
    }
  }

  /**
   * Build browser response
   */
  private buildResponse(
    browserId: string,
    url: string,
    content: PageContent,
    fromCache: boolean,
    context: BrowserExecutionContext,
    statistics?: Partial<BrowserStatistics>,
    chunks: any[] = [],
  ): BrowserResponse {
    return {
      browserId,
      url,
      content,
      chunks,
      statistics: {
        totalDurationMs: statistics?.totalDurationMs ?? 0,
        fetchDurationMs: statistics?.fetchDurationMs ?? 0,
        extractionDurationMs: statistics?.extractionDurationMs ?? 0,
        markdownDurationMs: statistics?.markdownDurationMs ?? 0,
        chunkingDurationMs: statistics?.chunkingDurationMs ?? 0,
        chunkCount: statistics?.chunkCount ?? 0,
        contentSizeBytes: statistics?.contentSizeBytes ?? 0,
        isDuplicate: statistics?.isDuplicate ?? false,
      },
      fromCache,
      success: true,
    }
  }

  /**
   * Chunk providers for concurrent execution
   */
  private chunkProviders(
    providerIds: string[],
    chunkSize: number,
  ): string[][] {
    const chunks: string[][] = []
    for (let i = 0; i < providerIds.length; i += chunkSize) {
      chunks.push(providerIds.slice(i, i + chunkSize))
    }
    return chunks
  }
}
