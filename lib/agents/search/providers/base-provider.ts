/**
 * Base Search Provider
 * 
 * Reusable abstraction implementing common provider functionality.
 * Provider implementations should extend this class.
 */

import type {
  SearchRequest,
  SearchResult,
  ProviderCapabilities,
} from '../types'
import { SearchProvider, ProviderHealthStatus, ProviderTimeoutError, ProviderNetworkError } from '../provider'
import { executeWithTimeout } from '../timeout'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:provider:base')

/**
 * Base implementation of SearchProvider
 */
export abstract class BaseSearchProvider extends SearchProvider {
  /**
   * Execute provider request with timeout and error handling
   */
  protected async executeRequest<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    try {
      return await executeWithTimeout(fn(), timeoutMs, this.name)
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        throw error
      }
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new ProviderTimeoutError(this.name, timeoutMs)
      }
      throw error
    }
  }

  /**
   * Validate search request
   */
  protected validateRequest(request: SearchRequest): void {
    if (!request.query.query || request.query.query.trim().length === 0) {
      throw new Error('Search query is required')
    }

    if (request.timeoutMs < 1000) {
      throw new Error('Timeout must be at least 1000ms')
    }
  }

  /**
   * Map error to provider-specific error
   */
  protected mapError(error: unknown): Error {
    if (error instanceof Error) {
      return error
    }
    return new Error(String(error))
  }

  /**
   * Normalize result score to 0-1 range
   */
  protected normalizeScore(score: number): number {
    return Math.max(0, Math.min(1, score))
  }

  /**
   * Log request metrics
   */
  protected logMetrics(
    operation: string,
    durationMs: number,
    details?: Record<string, unknown>,
  ): void {
    logger.debug(`${this.name} ${operation}`, {
      durationMs,
      ...details,
    })
  }
}
