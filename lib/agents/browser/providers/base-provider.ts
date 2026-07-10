import type { BrowserCapabilities, BrowserMetadata, BrowserRequest } from '../types'
import { BrowserProvider, type BrowserHealthStatus } from '../provider'
import type { ResolvedBrowserProviderConfig } from '../factory'
import { ContentTooLargeError, ProviderUnavailableError, ValidationError } from '../errors'

export type BaseProviderConfig = ResolvedBrowserProviderConfig

export abstract class BaseBrowserProvider extends BrowserProvider {
  protected lastHealthCheckAt?: Date
  protected lastHealthCheckStatus?: BrowserHealthStatus
  protected failureCount = 0
  protected successCount = 0

  constructor(protected readonly config: BaseProviderConfig) {
    super()
  }

  protected validateRequest(request: BrowserRequest): URL {
    if (!request.url?.trim()) throw new ValidationError('URL is required')
    let parsed: URL
    try {
      parsed = new URL(request.url)
    } catch (cause) {
      throw new ValidationError(`Invalid URL: ${request.url}`, { cause })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ValidationError(`Unsupported URL protocol: ${parsed.protocol}`)
    }
    const timeoutMs = request.timeoutMs ?? this.config.timeoutMs
    if (timeoutMs < 1_000) throw new ValidationError('Timeout must be at least 1000ms')
    return parsed
  }

  protected validatePageSize(sizeBytes: number): void {
    if (sizeBytes > this.config.maxPageSizeBytes) {
      throw new ContentTooLargeError(sizeBytes, this.config.maxPageSizeBytes)
    }
  }

  protected recordSuccess(): void {
    this.successCount++
  }

  protected recordFailure(): void {
    this.failureCount++
  }

  protected getReliabilityScore(): number {
    const total = this.successCount + this.failureCount
    return total === 0 ? 1 : this.successCount / total
  }

  async healthCheck(): Promise<BrowserHealthStatus> {
    const startedAt = performance.now()
    try {
      const status = await this.checkHealth()
      this.lastHealthCheckAt = new Date()
      this.lastHealthCheckStatus = { ...status, latencyMs: Math.round(performance.now() - startedAt) }
      return this.lastHealthCheckStatus
    } catch (cause) {
      const error = cause instanceof Error ? cause : new ProviderUnavailableError(this.name)
      const status: BrowserHealthStatus = {
        healthy: false,
        message: error.message,
        authenticated: this.isAuthenticated(),
        status: 'unavailable',
        configurationValid: false,
        fetchCapable: false,
        latencyMs: Math.round(performance.now() - startedAt),
        version: this.version,
        available: false,
      }
      this.lastHealthCheckAt = new Date()
      this.lastHealthCheckStatus = status
      return status
    }
  }

  protected abstract checkHealth(): Promise<BrowserHealthStatus>

  override getMetadata(): BrowserMetadata {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      authenticated: this.isAuthenticated(),
      healthy: this.lastHealthCheckStatus?.healthy ?? false,
      lastHealthCheck: this.lastHealthCheckAt,
      capabilities: { ...this.getCapabilities(), reliability: this.getReliabilityScore() },
    }
  }

  abstract getCapabilities(): BrowserCapabilities
}
