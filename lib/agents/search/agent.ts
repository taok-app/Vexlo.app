/**
 * Base Search Agent
 * 
 * Production-ready SearchAgent that orchestrates search provider execution.
 * Implements the complete search pipeline with proper isolation and extensibility.
 */

import { nanoid } from 'nanoid'
import type {
  SearchQuery,
  SearchRequest,
  SearchResponse,
  SearchStatistics,
  SearchExecutionContext,
  ProviderSelectionOptions,
} from './types'
import type { ProviderExecutionResult } from './provider'
import {
  normalizeSearchResults,
  filterCompleteResults,
} from './normalization'
import {
  deduplicateResultsWithTracking,
  UrlDeduplicationStrategy,
} from './deduplication'
import { rankResults, getTopRankedResults } from './ranking'
import { getProviderRegistry } from './registry'
import { getProviderFactory } from './factory'
import { getProviderSelector } from './selector'
import {
  executeWithRetry,
  DEFAULT_RETRY_CONFIG,
} from './retry'
import { executeWithTimeout } from './timeout'
import { searchTelemetry } from './telemetry'
import { generateSearchId, generateRequestId, measureTime } from './utils'
import {
  DEFAULT_SEARCH_TIMEOUT_MS,
  DEFAULT_RESULT_LIMIT,
  MAX_CONCURRENT_PROVIDERS,
} from './constants'
import {
  SearchTimeoutError,
  AllProvidersFailedError,
  SearchValidationError,
  NoProvidersAvailableError,
} from './errors'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:agent')

/**
 * Base SearchAgent implementation
 */
export class SearchAgent {
  private registry = getProviderRegistry()
  private factory = getProviderFactory()
  private selector = getProviderSelector()

  /**
   * Execute a search query
   */
  async search(
    query: SearchQuery,
    context?: Partial<SearchExecutionContext>,
  ): Promise<SearchResponse> {
    const searchId = generateSearchId()
    const executionContext = this.buildExecutionContext(searchId, context)

    try {
      // Validate query
      this.validateQuery(query)

      logger.info('Search started', {
        searchId,
        query: query.query,
      })

      searchTelemetry.searchStarted(searchId)

      // Execute search pipeline
      const response = await this.executePipeline(query, executionContext)

      logger.info('Search completed', {
        searchId,
        resultCount: response.results.length,
        duration: response.statistics.totalDurationMs,
      })

      searchTelemetry.searchCompleted(
        searchId,
        response.statistics.totalDurationMs,
        response.results.length,
      )

      return response
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Search failed', {
        searchId,
        error: err.message,
      })

      searchTelemetry.searchError(searchId, err)
      throw err
    }
  }

  /**
   * Execute the complete search pipeline
   */
  private async executePipeline(
    query: SearchQuery,
    context: SearchExecutionContext,
  ): Promise<SearchResponse> {
    const startTime = performance.now()
    const errors = new Map<string, SearchProviderError>()

    // Step 1: Select providers
    const selectedProviders = this.selector.selectProviders(query, {
      strategy: 'all',
    })

    if (selectedProviders.length === 0) {
      throw new NoProvidersAvailableError()
    }

    logger.debug('Providers selected', {
      count: selectedProviders.length,
      providers: selectedProviders,
    })

    // Step 2: Execute providers in parallel
    const executionStart = performance.now()
    const results = await this.executeProvidersParallel(
      selectedProviders,
      query,
      context,
      errors,
    )
    const executionDuration = performance.now() - executionStart

    // Step 3: Normalize results
    const normalizationStart = performance.now()
    const normalized = this.normalizeResults(results, selectedProviders)
    const normalizationDuration = performance.now() - normalizationStart

    // Step 4: Filter incomplete results
    const filtered = filterCompleteResults(normalized)

    // Step 5: Deduplicate results
    const deduplicationStart = performance.now()
    const { results: deduplicated, duplicateCount } =
      deduplicateResultsWithTracking(
        filtered,
        new UrlDeduplicationStrategy(),
      )
    const deduplicationDuration = performance.now() - deduplicationStart

    // Step 6: Rank results
    const rankingStart = performance.now()
    const ranked = rankResults(deduplicated)
    const rankingDuration = performance.now() - rankingStart

    // Step 7: Apply limit
    const limit = query.limit ?? DEFAULT_RESULT_LIMIT
    const finalResults = ranked.slice(0, limit)

    const totalDuration = performance.now() - startTime

    // Build response
    const response: SearchResponse = {
      searchId: context.executionId,
      query,
      results: finalResults,
      totalBefore: results.length,
      totalAfter: finalResults.length,
      statistics: {
        totalDurationMs: Math.round(totalDuration),
        executionDurationMs: Math.round(executionDuration),
        normalizationDurationMs: Math.round(normalizationDuration),
        deduplicationDurationMs: Math.round(deduplicationDuration),
        rankingDurationMs: Math.round(rankingDuration),
        duplicatesRemoved: duplicateCount,
        providersExecuted: selectedProviders.length,
        successfulProviders: selectedProviders.length - errors.size,
        failedProviders: errors.size,
        totalResultsCollected: results.length,
      },
      providers: selectedProviders,
      errors: Array.from(errors.entries()).map(([provider, error]) => ({
        provider,
        code: error.code,
        message: error.message,
        timestamp: new Date(),
        retryable: error.retryable,
      })),
      summary: {
        success: errors.size === 0 || results.length > 0,
        message:
          errors.size === 0
            ? `Found ${finalResults.length} results from ${selectedProviders.length} providers`
            : `Found ${finalResults.length} results (${errors.size} providers failed)`,
        providersUsed: selectedProviders.filter((p) => !errors.has(p)),
        providersFailed: Array.from(errors.keys()),
        warnings: Array.from(errors.values()).map((e) => e.message),
      },
    }

    return response
  }

  /**
   * Execute multiple providers in parallel
   */
  private async executeProvidersParallel(
    providerIds: string[],
    query: SearchQuery,
    context: SearchExecutionContext,
    errors: Map<string, any>,
  ): Promise<any[]> {
    // Limit concurrent executions
    const chunks = this.chunkProviders(providerIds, MAX_CONCURRENT_PROVIDERS)
    const allResults: any[] = []

    for (const chunk of chunks) {
      const promises = chunk.map((providerId) =>
        this.executeProvider(providerId, query, context).catch((error) => {
          errors.set(providerId, error)
          return []
        }),
      )

      const chunkResults = await Promise.all(promises)
      allResults.push(...chunkResults.flat())
    }

    return allResults
  }

  /**
   * Execute a single provider
   */
  private async executeProvider(
    providerId: string,
    query: SearchQuery,
    context: SearchExecutionContext,
  ): Promise<any[]> {
    const provider = this.registry.resolve(providerId)

    const request: SearchRequest = {
      requestId: generateRequestId(),
      query,
      provider: providerId,
      timeoutMs: context.timeoutMs ?? DEFAULT_SEARCH_TIMEOUT_MS,
      retry: DEFAULT_RETRY_CONFIG,
    }

    const { result: results, durationMs } = await measureTime(
      () =>
        executeWithTimeout(
          executeWithRetry(
            () => provider.search(request),
            {
              config: DEFAULT_RETRY_CONFIG,
              onRetry: (attempt, error, nextDelayMs) => {
                logger.debug('Provider retry', {
                  provider: providerId,
                  attempt,
                  error: error.message,
                  nextDelayMs,
                })
              },
            },
          ),
          request.timeoutMs,
          providerId,
        ),
    )

    searchTelemetry.providerSuccess(providerId, durationMs, results.length)

    logger.debug('Provider executed successfully', {
      provider: providerId,
      resultCount: results.length,
      durationMs,
    })

    return results
  }

  /**
   * Normalize results from multiple providers
   */
  private normalizeResults(
    results: any[],
    providerIds: string[],
  ): any[] {
    if (results.length === 0) {
      return []
    }

    return normalizeSearchResults(
      results,
      providerIds[0] ?? 'unknown',
    )
  }

  /**
   * Validate search query
   */
  private validateQuery(query: SearchQuery): void {
    if (!query.query || query.query.trim().length === 0) {
      throw new SearchValidationError('Search query cannot be empty')
    }

    if (query.query.length > 500) {
      throw new SearchValidationError('Search query is too long (max 500 characters)')
    }

    if (query.limit !== undefined) {
      if (query.limit < 1 || query.limit > 100) {
        throw new SearchValidationError('Result limit must be between 1 and 100')
      }
    }
  }

  /**
   * Build execution context
   */
  private buildExecutionContext(
    searchId: string,
    partial?: Partial<SearchExecutionContext>,
  ): SearchExecutionContext {
    return {
      executionId: searchId,
      organizationId: partial?.organizationId ?? 'default',
      userId: partial?.userId,
      timeoutMs: partial?.timeoutMs ?? DEFAULT_SEARCH_TIMEOUT_MS,
      context: partial?.context,
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

/**
 * Custom error type for provider execution
 */
interface SearchProviderError extends Error {
  code: string
  retryable: boolean
}
