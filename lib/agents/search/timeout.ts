/**
 * Timeout Management for Search Providers
 * 
 * Ensures all search operations complete within specified time limits.
 */

import { DEFAULT_SEARCH_TIMEOUT_MS, MAX_SEARCH_TIMEOUT_MS } from './constants'
import { ProviderTimeoutError } from './provider'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:timeout')

/**
 * Validate and normalize timeout value
 */
export function validateTimeout(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined) {
    return DEFAULT_SEARCH_TIMEOUT_MS
  }

  if (timeoutMs < 0) {
    throw new Error('Timeout must be non-negative')
  }

  if (timeoutMs > MAX_SEARCH_TIMEOUT_MS) {
    logger.warn('Timeout exceeds maximum, capping', {
      requested: timeoutMs,
      maximum: MAX_SEARCH_TIMEOUT_MS,
    })
    return MAX_SEARCH_TIMEOUT_MS
  }

  return timeoutMs
}

/**
 * Create a promise that rejects after the specified timeout
 */
export function createTimeoutPromise<T>(timeoutMs: number, provider?: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      if (provider) {
        reject(new ProviderTimeoutError(provider, timeoutMs))
      } else {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`))
      }
    }, timeoutMs)
  })
}

/**
 * Execute a promise with timeout
 */
export async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  provider?: string,
): Promise<T> {
  const validatedTimeout = validateTimeout(timeoutMs)

  return Promise.race([
    promise,
    createTimeoutPromise<T>(validatedTimeout, provider),
  ])
}

/**
 * Create a timeout controller for managing multiple concurrent operations
 */
export class TimeoutController {
  private timers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Create a timeout that cancels an operation
   */
  createTimeout(
    id: string,
    timeoutMs: number,
    onTimeout: () => void,
  ): void {
    const timer = setTimeout(() => {
      this.timers.delete(id)
      onTimeout()
    }, timeoutMs)

    this.timers.set(id, timer)
  }

  /**
   * Cancel a timeout
   */
  cancel(id: string): void {
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }
  }

  /**
   * Cancel all timeouts
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }

  /**
   * Get number of active timeouts
   */
  get activeCount(): number {
    return this.timers.size
  }
}
