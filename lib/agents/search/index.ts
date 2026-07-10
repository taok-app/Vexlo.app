/**
 * Search Agent Main Export
 * 
 * Public API for the Search Agent module.
 * Other modules should only import from this file.
 */

// Types
export type {
  SearchQuery,
  SearchRequest,
  SearchResponse,
  SearchResult,
  SearchResultMetadata,
  SearchStatistics,
  SearchExecutionContext,
  SearchExecutionSummary,
  SearchErrorReport,
  RetryConfig,
  ProviderCapabilities,
  ProviderMetadata,
  ProviderSelectionStrategy,
  ProviderSelectionOptions,
  SearchTelemetryEvent,
} from './types'

// Provider Interface
export {
  SearchProvider,
  ProviderHealthStatus,
  ProviderExecutionResult,
  SearchProviderError,
  ProviderAuthenticationError,
  ProviderRateLimitError,
  ProviderNetworkError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  ProviderConfigurationError,
} from './provider'

// Error Hierarchy
export {
  SearchError,
  SearchValidationError,
  SearchTimeoutError,
  AllProvidersFailedError,
  NoProvidersAvailableError,
  ProviderNotFoundError,
  InvalidProviderConfigError,
} from './errors'

// Registry
export {
  ProviderRegistry,
  getProviderRegistry,
  resetProviderRegistry,
} from './registry'

// Factory
export type { ProviderConfig } from './factory'
export {
  ProviderFactory,
  getProviderFactory,
  resetProviderFactory,
} from './factory'

// Selector
export {
  ProviderSelector,
  getProviderSelector,
  resetProviderSelector,
} from './selector'

// SearchAgent
export { SearchAgent } from './agent'

// Normalization
export {
  normalizeUrl,
  extractDomain,
  normalizeSearchResult,
  normalizeSearchResults,
  isCompleteResult,
  filterCompleteResults,
} from './normalization'

// Deduplication
export type { DeduplicationStrategy }
export {
  UrlDeduplicationStrategy,
  DomainDeduplicationStrategy,
  deduplicateResults,
  deduplicateResultsWithTracking,
  groupResultsByDomain,
  ensureDiverseResults,
} from './deduplication'

// Ranking
export {
  calculateFreshnessScore,
  calculateDomainAuthorityScore,
  calculateCompletenessScore,
  calculateDuplicatePenalty,
  rankResults,
  getTopRankedResults,
} from './ranking'

// Retry
export {
  isRetryableError,
  calculateRetryDelay,
  executeWithRetry,
  RetryConfigBuilder,
} from './retry'

// Timeout
export {
  validateTimeout,
  createTimeoutPromise,
  executeWithTimeout,
  TimeoutController,
} from './timeout'

// Telemetry
export { SearchTelemetry, searchTelemetry } from './telemetry'

// Constants
export {
  DEFAULT_SEARCH_TIMEOUT_MS,
  MAX_SEARCH_TIMEOUT_MS,
  DEFAULT_RESULT_LIMIT,
  MAX_RESULT_LIMIT,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_LANGUAGE,
} from './constants'

// Utils
export {
  generateSearchId,
  generateRequestId,
  parseSearchQuery,
  formatSearchQuery,
  truncateText,
  escapeSearchQuery,
  measureTime,
  chunkArray,
  sleep,
} from './utils'
