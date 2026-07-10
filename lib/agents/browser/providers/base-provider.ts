/**
 * Base Browser Provider
 *
 * Reusable abstraction implementing common browser provider functionality.
 * All production providers inherit from this to share:
 * - Request validation
 * - Timeout handling
 * - Retry orchestration
 * - Telemetry hooks
 * - Error translation
 * - Health check template
 */

import type { BrowserRequest, PageContent, BrowserCapabilities, BrowserMetadata } from '../types'
import { BrowserProvider, type BrowserHealthStatus } from '../provider'
import { BrowserTimeoutError } from '../errors'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:provider:base')

/**
 * Configuration for base provider behavior
 */
export interface BaseProviderConfig {
  id: string
  timeoutMs: number
  maxRetries: number
  retryDelayMs: number
  maxPageSizeBytes: number
}

/**
 * Base implementation of BrowserProvider with shared functionality
 */
export abstract class BaseBrowserProvider extends BrowserProvider {
  protected config: BaseProviderConfig
  protected lastHealthCheckAt: Date | null = null
  protected lastHealthCheckStatus: BrowserHealthStatus | null = null
  protected failureCount = 0
  protected successCount = 0

  constructor(config: BaseProviderConfig) {
    super()
    this.config = config
  }

  /**
   * Execute request with timeout and retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.executeRequest(operation, this.config.timeoutMs)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        logger.warn(`Provider operation failed: ${operationName}`, {
          provider: this.name,
          attempt,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
        })

        this.failureCount++

        // Don't retry on last attempt
        if (attempt < this.config.maxRetries) {
          const delayMs = this.config.retryDelayMs * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    if (lastError) {
      throw lastError
    }

    throw new Error(`${operationName} failed`)
  }

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
        setTimeout(() => reject(new BrowserTimeoutError(timeoutMs)), timeoutMs),
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
      throw new Error(`Invalid URL format`)
    }

    if (request.timeoutMs < 1000) {
      throw new Error('Timeout must be at least 1000ms')
    }
  }

  /**
   * Validate page size
   */
  protected validatePageSize(sizeBytes: number): void {
    if (sizeBytes > this.config.maxPageSizeBytes) {
      throw new Error(
        `Page too large: ${sizeBytes} bytes exceeds limit of ${this.config.maxPageSizeBytes} bytes`,
      )
    }
  }

  /**
   * Map error to standardized browser error
   */
  protected mapError(error: unknown, context?: string): Error {
    if (error instanceof Error) {
      return error
    }

    const message = String(error)
    if (context) {
      return new Error(`${context}: ${message}`)
    }

    return new Error(message)
  }

  /**
   * Record operation metrics
   */
  protected recordMetric(operation: string, durationMs: number, success: boolean): void {
    if (success) {
      this.successCount++
    } else {
      this.failureCount++
    }

    logger.debug(`Provider metric: ${operation}`, {
      provider: this.name,
      durationMs,
      success,
      successCount: this.successCount,
      failureCount: this.failureCount,
    })
  }

  /**
   * Get provider reliability score (0-1)
   */
  protected getReliabilityScore(): number {
    const total = this.successCount + this.failureCount
    if (total === 0) return 1.0
    return this.successCount / total
  }

  /**
   * Normalize metadata
   */
  protected normalizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return {
      ...metadata,
      normalizedAt: new Date().toISOString(),
      provider: this.name,
      version: this.version,
    }
  }

  /**
   * Template method for health check
   */
  async healthCheck(): Promise<BrowserHealthStatus> {
    try {
      const status = await this.checkHealth()

      this.lastHealthCheckStatus = status
      this.lastHealthCheckAt = new Date()

      return status
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error(`Provider health check failed: ${this.name}`, {
        error: errorMessage,
      })

      const failureStatus: BrowserHealthStatus = {
        healthy: false,
        message: `Health check failed: ${errorMessage}`,
        authenticated: false,
        details: {
          error: errorMessage,
          lastSuccessful: this.lastHealthCheckAt?.toISOString(),
        },
      }

      this.lastHealthCheckStatus = failureStatus
      return failureStatus
    }
  }

  /**
   * Abstract method for provider-specific health check
   */
  protected abstract checkHealth(): Promise<BrowserHealthStatus>

  /**
   * Get provider metadata
   */
  override getMetadata(): BrowserMetadata {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      authenticated: this.isAuthenticated(),
      healthy: this.lastHealthCheckStatus?.healthy ?? false,
      capabilities: this.getCapabilities(),
      lastHealthCheckAt: this.lastHealthCheckAt?.toISOString(),
      reliabilityScore: this.getReliabilityScore(),
    }
  }

  /**
   * Check if provider is authenticated (override as needed)
   */
  protected isAuthenticated(): boolean {
    return true
  }
}
