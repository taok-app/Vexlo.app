/**
 * Search Agent Error Hierarchy
 * 
 * Comprehensive error handling for search operations.
 */

/**
 * Base error for all search operations
 */
export class SearchError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode: number = 500,
  ) {
    super(message)
    this.name = 'SearchError'
  }
}

/**
 * Search validation error
 */
export class SearchValidationError extends SearchError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
    this.name = 'SearchValidationError'
  }
}

/**
 * Search timeout error
 */
export class SearchTimeoutError extends SearchError {
  constructor(timeoutMs: number) {
    super(`Search operation timed out after ${timeoutMs}ms`, 'TIMEOUT', 504)
    this.name = 'SearchTimeoutError'
  }
}

/**
 * All providers failed
 */
export class AllProvidersFailedError extends SearchError {
  constructor(readonly errors: Map<string, Error>) {
    super(
      `All search providers failed. Errors: ${Array.from(errors.entries())
        .map(([p, e]) => `${p}: ${e.message}`)
        .join('; ')}`,
      'ALL_PROVIDERS_FAILED',
      503,
    )
    this.name = 'AllProvidersFailedError'
  }
}

/**
 * No providers available
 */
export class NoProvidersAvailableError extends SearchError {
  constructor() {
    super('No search providers are available', 'NO_PROVIDERS_AVAILABLE', 503)
    this.name = 'NoProvidersAvailableError'
  }
}

/**
 * Provider not found
 */
export class ProviderNotFoundError extends SearchError {
  constructor(providerName: string) {
    super(`Search provider '${providerName}' not found`, 'PROVIDER_NOT_FOUND', 404)
    this.name = 'ProviderNotFoundError'
  }
}

/**
 * Invalid provider configuration
 */
export class InvalidProviderConfigError extends SearchError {
  constructor(message: string) {
    super(message, 'INVALID_PROVIDER_CONFIG', 400)
    this.name = 'InvalidProviderConfigError'
  }
}
