import { describe, expect, it, vi } from 'vitest'
import { executeWithRetry, calculateBackoffDelay, DEFAULT_RETRY_POLICY } from '@/lib/research/runtime/retry'
import type { RetryPolicy } from '@/lib/research/runtime'

describe('Retry utilities', () => {
  it('should execute operation successfully on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const result = await executeWithRetry(operation, 'test')

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should retry operation on failure', async () => {
    let attempts = 0
    const operation = vi.fn().mockImplementation(() => {
      attempts++
      if (attempts < 2) {
        return Promise.reject(new Error('fail'))
      }
      return Promise.resolve('success')
    })

    const result = await executeWithRetry(operation, 'test', DEFAULT_RETRY_POLICY)

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should exhaust retries and throw', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('always fails'))
    const policy: RetryPolicy = {
      maxAttempts: 2,
      initialDelayMs: 10,
      maxDelayMs: 50,
      backoffMultiplier: 2,
    }

    await expect(executeWithRetry(operation, 'test', policy)).rejects.toThrow('always fails')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should calculate backoff delay correctly', () => {
    const policy: RetryPolicy = {
      maxAttempts: 5,
      initialDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2,
    }

    expect(calculateBackoffDelay(1, policy)).toBe(100)
    expect(calculateBackoffDelay(2, policy)).toBe(200)
    expect(calculateBackoffDelay(3, policy)).toBe(400)
    expect(calculateBackoffDelay(4, policy)).toBe(800)
    expect(calculateBackoffDelay(5, policy)).toBe(1000)
  })

  it('should respect abort signal', async () => {
    const controller = new AbortController()
    const operation = vi.fn().mockImplementation(() => {
      controller.abort()
      return new Promise((resolve) => setTimeout(() => resolve('should not complete'), 1000))
    })

    await expect(executeWithRetry(operation, 'test', DEFAULT_RETRY_POLICY, controller.signal)).rejects.toThrow()
  })

  it('should use custom retry policy', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('fail'))
    const policy: RetryPolicy = {
      maxAttempts: 4,
      initialDelayMs: 50,
      maxDelayMs: 500,
      backoffMultiplier: 3,
    }

    await expect(executeWithRetry(operation, 'test', policy)).rejects.toThrow()
    expect(operation).toHaveBeenCalledTimes(4)
  })
})
