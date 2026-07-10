/**
 * Search Provider Interface
 * 
 * Every search provider must implement this contract.
 * This is the only mechanism for adding new providers.
 */

import type {
  SearchQuery,
  SearchRequest,
  SearchResult,
  ProviderMetadata,
  ProviderCapabilities,
} from './types'

/**
 * Abstract base class for all search providers
 * 
 * Every provider must:
 * 1. Implement the search() method
 * 2. Implement the healthCheck() method
 * 3. Provide accurate capabilities()
 * 4. Handle timeouts and retries internally
 * 5. Emit telemetry events
 * 6. Never throw uncaught exceptions
 */
export abstract class SearchProvider {
  /** Provider name */
  abstract readonly name: string

  /** Provider version */
  abstract readonly version: string

  /** Provider description */
  abstract readonly description: string

  /**
   * Execute a search query
   * 
   * @param request - The search request
   * @returns Array of normalized search results
   * @throws SearchError or subclass on failure
   */
  abstract search(request: SearchRequest): Promise<SearchResult[]>

  /**
   * Check provider health and authentication
   * 
   * @returns Health status
   */
  abstract healthCheck(): Promise<ProviderHealthStatus>

  /**
   * Get provider capabilities
   * 
   * @returns Capabilities object
   */
  abstract getCapabilities(): ProviderCapabilities

  /**
   * Optional: Initialize provider
   * Called once during registration
   */
  async initialize?(): Promise<void>

  /**
   * Optional: Warm up provider (e.g., establish connections)
   * Called before search operations begin
   */
  async warmup?(): Promise<void>

  /**
   * Optional: Shutdown provider gracefully
   * Called during application shutdown
   */
  async shutdown?(): Promise<void>

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      authenticated: this.isAuthenticated(),
      healthy: false, // Will be updated by health check
      capabilities: this.getCapabilities(),
    }
  }

  /**
   * Check if provider is authenticated
   * Override in subclasses
   */
  protected isAuthenticated(): boolean {
    return true
  }
}

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  /** Overall health */
  healthy: boolean
  /** Status message */
  message: string
  /** Authentication status */
  authenticated: boolean
  /** Rate limit info */
  rateLimitRemaining?: number
  /** When rate limit resets */
  rateLimitResetAt?: Date
  /** Additional details */
  details?: Record<string, unknown>
}

/**
 * Result of a single provider execution
 */
export interface ProviderExecutionResult {
  /** Provider name */
  provider: string
  /** Whether execution succeeded */
  success: boolean
  /** Results (if successful) */
  results?: SearchResult[]
  /** Error (if failed) */
  error?: SearchProviderError
  /** Execution time in milliseconds */
  durationMs: number
  /** Number of retries attempted */
  retries: number
}

/**
 * Search provider error base class
 */
export class SearchProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly provider: string,
    readonly retryable: boolean = false,
  ) {
    super(message)
    this.name = 'SearchProviderError'
  }
}

/**
 * Provider is not authenticated
 */
export class ProviderAuthenticationError extends SearchProviderError {
  constructor(provider: string, message: string = 'Provider authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', provider, false)
    this.name = 'ProviderAuthenticationError'
  }
}

/**
 * Provider rate limit exceeded
 */
export class ProviderRateLimitError extends SearchProviderError {
  readonly resetAt?: Date

  constructor(provider: string, resetAt?: Date) {
    super('Provider rate limit exceeded', 'RATE_LIMIT_EXCEEDED', provider, true)
    this.resetAt = resetAt
    this.name = 'ProviderRateLimitError'
  }
}

/**
 * Provider network error
 */
export class ProviderNetworkError extends SearchProviderError {
  constructor(provider: string, message: string = 'Network error') {
    super(message, 'NETWORK_ERROR', provider, true)
    this.name = 'ProviderNetworkError'
  }
}

/**
 * Provider timeout
 */
export class ProviderTimeoutError extends SearchProviderError {
  constructor(provider: string, timeoutMs: number) {
    super(`Request timeout after ${timeoutMs}ms`, 'TIMEOUT', provider, true)
    this.name = 'ProviderTimeoutError'
  }
}

/**
 * Provider not available
 */
export class ProviderUnavailableError extends SearchProviderError {
  constructor(provider: string, reason: string = 'Provider unavailable') {
    super(reason, 'UNAVAILABLE', provider, true)
    this.name = 'ProviderUnavailableError'
  }
}

/**
 * Provider configuration error
 */
export class ProviderConfigurationError extends SearchProviderError {
  constructor(provider: string, message: string) {
    super(message, 'CONFIGURATION_ERROR', provider, false)
    this.name = 'ProviderConfigurationError'
  }
}
