/**
 * Base Browser Provider
 * 
 * Reusable abstraction implementing common browser provider functionality.
 */

import type { BrowserRequest, PageContent } from './types'
import { BrowserProvider } from './provider'
import { BrowserTimeoutError } from './errors'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:provider:base')

/**
 * Base implementation of BrowserProvider
 */
export abstract class BaseBrowserProvider extends BrowserProvider {
  /**
   * Execute request with timeout
   */
  protected async executeRequest<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new BrowserTimeoutError(timeoutMs)),
          timeoutMs,
        ),
      ),
    ])
  }

  /**
   * Validate browser request
   */
  protected validateRequest(request: BrowserRequest): void {
    if (!request.url || request.url.trim().length === 0) {
      throw new Error('URL is required')
    }

    try {
      new URL(request.url)
    } catch {
      throw new Error(`Invalid URL: ${request.url}`)
    }

    if (request.timeoutMs < 1000) {
      throw new Error('Timeout must be at least 1000ms')
    }
  }

  /**
   * Map error to browser error
   */
  protected mapError(error: unknown): Error {
    if (error instanceof Error) {
      return error
    }
    return new Error(String(error))
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
