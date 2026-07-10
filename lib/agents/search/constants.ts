/**
 * Search Agent Constants
 */

/** Default timeout for search requests in milliseconds */
export const DEFAULT_SEARCH_TIMEOUT_MS = 30_000

/** Maximum timeout for search requests in milliseconds */
export const MAX_SEARCH_TIMEOUT_MS = 120_000

/** Default number of results to return */
export const DEFAULT_RESULT_LIMIT = 20

/** Maximum number of results to return */
export const MAX_RESULT_LIMIT = 100

/** Default retry configuration */
export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
} as const

/** Default language for searches */
export const DEFAULT_LANGUAGE = 'en'

/** Minimum provider score (0-1) */
export const MIN_PROVIDER_SCORE = 0.0

/** Maximum provider score (0-1) */
export const MAX_PROVIDER_SCORE = 1.0

/** URL normalization: maximum length for URL comparison */
export const MAX_URL_LENGTH_FOR_COMPARISON = 2048

/** Duplicate detection: similarity threshold for URLs (0-1) */
export const DUPLICATE_URL_THRESHOLD = 0.95

/** Ranking: weight for provider score */
export const RANKING_WEIGHT_PROVIDER_SCORE = 0.3

/** Ranking: weight for freshness */
export const RANKING_WEIGHT_FRESHNESS = 0.2

/** Ranking: weight for domain authority (placeholder) */
export const RANKING_WEIGHT_DOMAIN_AUTHORITY = 0.2

/** Ranking: weight for result completeness */
export const RANKING_WEIGHT_COMPLETENESS = 0.15

/** Ranking: weight for duplicate penalty */
export const RANKING_WEIGHT_DUPLICATE_PENALTY = 0.15

/** Freshness: maximum age in days to consider fresh */
export const FRESHNESS_MAX_DAYS = 7

/** Freshness: score for results older than MAX_AGE_DAYS */
export const STALE_RESULT_SCORE = 0.3

/** Search execution ID prefix for tracking */
export const SEARCH_ID_PREFIX = 'search_'

/** Maximum concurrent provider executions */
export const MAX_CONCURRENT_PROVIDERS = 5

/** Health check interval in milliseconds */
export const HEALTH_CHECK_INTERVAL_MS = 60_000

/** Default organization ID for single-tenant mode */
export const DEFAULT_ORG_ID = 'default'
