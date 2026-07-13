import { createLogger } from '@/lib/logging'

const logger = createLogger('[Runtime.Retry]')
import type { RetryPolicy } from './types'

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
}

export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  label: string,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: Error | null = null
  let delay = policy.initialDelayMs

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      if (signal?.aborted) {
        throw new Error('Retry operation cancelled')
      }

      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === policy.maxAttempts) {
        logger.error(`[Runtime] ${label} failed after ${attempt} attempts`, {
          error: lastError.message,
        })
        throw lastError
      }

      logger.warn(`[Runtime] ${label} attempt ${attempt} failed, retrying in ${delay}ms`, {
        error: lastError.message,
      })

      await new Promise((resolve) => setTimeout(resolve, delay))
      delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelayMs)
    }
  }

  throw lastError || new Error(`${label} failed after ${policy.maxAttempts} attempts`)
}

export function calculateBackoffDelay(attempt: number, policy: RetryPolicy): number {
  let delay = policy.initialDelayMs
  for (let i = 1; i < attempt; i++) {
    delay = Math.min(delay * policy.backoffMultiplier, policy.maxDelayMs)
  }
  return delay
}
