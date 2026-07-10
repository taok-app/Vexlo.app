/**
 * Retry Strategy for Search Providers
 * 
 * Implements exponential backoff with jitter for retryable errors.
 */

import type { RetryConfig } from './types'
import { DEFAULT_RETRY_CONFIG } from './constants'
import { SearchProviderError, ProviderTimeoutError, ProviderNetworkError } from './provider'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:retry')

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof SearchProviderError) {
    return error.retryable
  }

  if (error instanceof ProviderTimeoutError || error instanceof ProviderNetworkError) {
    return true
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    )
  }

  return false
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempts)
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber - 1)

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)

  // Add jitter (±10%)
  const jitter = cappedDelay * 0.1 * (Math.random() * 2 - 1)
  return Math.max(0, cappedDelay + jitter)
}

/**
 * Execute a function with retry logic
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    config?: RetryConfig
    onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void
  } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_RETRY_CONFIG.maxAttempts
  const config = options.config ?? DEFAULT_RETRY_CONFIG
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if error is retryable
      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error
      }

      // Calculate delay and notify
      const nextDelayMs = calculateRetryDelay(attempt, config)

      if (options.onRetry) {
        options.onRetry(attempt, lastError, nextDelayMs)
      }

      logger.debug('Retrying after error', {
        attempt,
        maxAttempts,
        error: lastError.message,
        delayMs: nextDelayMs,
      })

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, nextDelayMs))
    }
  }

  throw lastError ?? new Error('Max retry attempts reached')
}

/**
 * Retry configuration builder for fluent API
 */
export class RetryConfigBuilder {
  private config: RetryConfig = { ...DEFAULT_RETRY_CONFIG }

  maxAttempts(value: number): this {
    this.config.maxAttempts = Math.max(1, value)
    return this
  }

  initialDelayMs(value: number): this {
    this.config.initialDelayMs = Math.max(0, value)
    return this
  }

  maxDelayMs(value: number): this {
    this.config.maxDelayMs = Math.max(this.config.initialDelayMs, value)
    return this
  }

  backoffMultiplier(value: number): this {
    this.config.backoffMultiplier = Math.max(1, value)
    return this
  }

  retryableErrorCodes(codes: number[]): this {
    this.config.retryableErrorCodes = codes
    return this
  }

  build(): RetryConfig {
    return { ...this.config }
  }
}
