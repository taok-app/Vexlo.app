/**
 * Search Agent Types
 * 
 * Defines all TypeScript models and interfaces for the Search Agent layer.
 * All providers must conform to these types.
 */

/**
 * Search query parameters
 */
export interface SearchQuery {
  /** The search query string */
  query: string
  /** Number of results to return */
  limit?: number
  /** Search language code (ISO 639-1) */
  language?: string
  /** Geographic region code (ISO 3166-1 alpha-2) */
  region?: string
  /** Additional search filters */
  filters?: Record<string, unknown>
}

/**
 * Provider-specific search request
 */
export interface SearchRequest {
  /** Unique request ID for tracking */
  requestId: string
  /** The search query */
  query: SearchQuery
  /** Provider name */
  provider: string
  /** Request timeout in milliseconds */
  timeoutMs: number
  /** Retry configuration */
  retry: RetryConfig
  /** Additional context */
  context?: Record<string, unknown>
}

/**
 * Individual search result from a provider
 */
export interface SearchResult {
  /** Unique identifier (typically URL) */
  id: string
  /** Result title */
  title: string
  /** Result URL */
  url: string
  /** Result snippet/excerpt */
  snippet: string
  /** Provider source name */
  provider: string
  /** Domain extracted from URL */
  domain: string
  /** Result language */
  language?: string
  /** Author or publication source */
  author?: string
  /** Publication/indexed date */
  publishedAt?: Date
  /** Provider confidence score (0-1) */
  providerScore: number
  /** Normalized ranking score (0-1) */
  rankingScore: number
  /** Additional metadata from provider */
  metadata: SearchResultMetadata
}

/**
 * Metadata associated with a search result
 */
export interface SearchResultMetadata {
  /** Content type (article, video, etc.) */
  contentType?: string
  /** Estimated reading time in minutes */
  readingTime?: number
  /** Whether result has been verified */
  verified?: boolean
  /** Provider-specific metadata */
  [key: string]: unknown
}

/**
 * Unified response from SearchAgent after processing
 */
export interface SearchResponse {
  /** Unique search execution ID */
  searchId: string
  /** Original query */
  query: SearchQuery
  /** Processed results (normalized, deduplicated, ranked) */
  results: SearchResult[]
  /** Total results before deduplication */
  totalBefore: number
  /** Total results after deduplication */
  totalAfter: number
  /** Execution statistics */
  statistics: SearchStatistics
  /** Providers that were executed */
  providers: string[]
  /** Any errors encountered during execution */
  errors: SearchErrorReport[]
  /** Execution summary */
  summary: SearchExecutionSummary
}

/**
 * Execution statistics for a search operation
 */
export interface SearchStatistics {
  /** Total execution time in milliseconds */
  totalDurationMs: number
  /** Time spent in parallel execution */
  executionDurationMs: number
  /** Time spent normalizing results */
  normalizationDurationMs: number
  /** Time spent deduplicating */
  deduplicationDurationMs: number
  /** Time spent ranking */
  rankingDurationMs: number
  /** Number of duplicate results removed */
  duplicatesRemoved: number
  /** Number of providers executed */
  providersExecuted: number
  /** Number of successful provider requests */
  successfulProviders: number
  /** Number of failed provider requests */
  failedProviders: number
  /** Total results collected from all providers */
  totalResultsCollected: number
}

/**
 * Execution summary for reporting
 */
export interface SearchExecutionSummary {
  /** Overall success status */
  success: boolean
  /** Human-readable summary */
  message: string
  /** Providers used */
  providersUsed: string[]
  /** Providers that failed */
  providersFailed: string[]
  /** Warnings encountered */
  warnings: string[]
  /** Recommendations for next search */
  recommendations?: string[]
}

/**
 * Provider capabilities advertisement
 */
export interface ProviderCapabilities {
  /** Maximum results per request */
  maxResultsPerRequest: number
  /** Supported languages */
  supportedLanguages: string[]
  /** Supported regions */
  supportedRegions: string[]
  /** Whether provider supports date filtering */
  supportsDateFilter: boolean
  /** Whether provider supports language filtering */
  supportsLanguageFilter: boolean
  /** Whether provider supports region filtering */
  supportsRegionFilter: boolean
  /** Average latency in milliseconds */
  averageLatencyMs: number
  /** Provider reliability (0-1) */
  reliability: number
  /** Whether provider requires authentication */
  requiresAuthentication: boolean
  /** Rate limit: requests per minute */
  rateLimit?: number
  /** Additional capabilities */
  custom?: Record<string, unknown>
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  /** Provider name */
  name: string
  /** Provider version */
  version: string
  /** Provider description */
  description: string
  /** Authentication status */
  authenticated: boolean
  /** Current health status */
  healthy: boolean
  /** Last health check timestamp */
  lastHealthCheck?: Date
  /** Provider capabilities */
  capabilities: ProviderCapabilities
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum retry attempts */
  maxAttempts: number
  /** Initial backoff delay in milliseconds */
  initialDelayMs: number
  /** Maximum backoff delay in milliseconds */
  maxDelayMs: number
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number
  /** Error codes that trigger retry */
  retryableErrorCodes?: number[]
}

/**
 * Search error report
 */
export interface SearchErrorReport {
  /** Provider that failed */
  provider: string
  /** Error code or name */
  code: string
  /** Human-readable error message */
  message: string
  /** Timestamp of error */
  timestamp: Date
  /** Whether this error is retryable */
  retryable: boolean
}

/**
 * Provider selection strategy
 */
export enum ProviderSelectionStrategy {
  /** Use all registered providers */
  ALL = 'all',
  /** Use primary provider only */
  PRIMARY = 'primary',
  /** Use specified providers */
  SPECIFIC = 'specific',
  /** Use providers matching capabilities */
  CAPABILITY_MATCH = 'capability_match',
  /** Automatic selection based on query */
  AUTO = 'auto',
}

/**
 * Provider selection options
 */
export interface ProviderSelectionOptions {
  /** Selection strategy */
  strategy: ProviderSelectionStrategy
  /** Specific providers to use (if SPECIFIC strategy) */
  providers?: string[]
  /** Required capabilities (if CAPABILITY_MATCH strategy) */
  requiredCapabilities?: (keyof ProviderCapabilities)[]
  /** Provider priority order */
  priority?: string[]
}

/**
 * Search execution context
 */
export interface SearchExecutionContext {
  /** Unique execution ID */
  executionId: string
  /** Organization ID (for multi-tenancy) */
  organizationId?: string
  /** User ID */
  userId?: string
  /** Request timeout override */
  timeoutMs?: number
  /** Custom context data */
  context?: Record<string, unknown>
}

/**
 * Telemetry event for search operations
 */
export interface SearchTelemetryEvent {
  /** Event type */
  type: 'search_started' | 'provider_success' | 'provider_failed' | 'search_completed' | 'search_error'
  /** Timestamp */
  timestamp: Date
  /** Provider name (if applicable) */
  provider?: string
  /** Duration in milliseconds */
  durationMs?: number
  /** Number of results */
  resultCount?: number
  /** Error details (if applicable) */
  error?: {
    code: string
    message: string
  }
  /** Additional metadata */
  metadata?: Record<string, unknown>
}
