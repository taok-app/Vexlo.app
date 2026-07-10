/**
 * Browser Agent Constants
 */

/** Default timeout for browser requests in milliseconds */
export const DEFAULT_BROWSER_TIMEOUT_MS = 30_000

/** Maximum timeout for browser requests in milliseconds */
export const MAX_BROWSER_TIMEOUT_MS = 120_000

/** Maximum page size to process (100 MB) */
export const MAX_PAGE_SIZE_BYTES = 100 * 1024 * 1024

/** Default chunk size in characters */
export const DEFAULT_CHUNK_SIZE = 4000

/** Default chunk overlap in characters */
export const DEFAULT_CHUNK_OVERLAP = 400

/** Browser cache TTL in milliseconds (1 hour) */
export const BROWSER_CACHE_TTL_MS = 60 * 60 * 1000

/** Maximum concurrent browser requests */
export const MAX_CONCURRENT_BROWSER_REQUESTS = 3

/** Supported content types for extraction */
export const SUPPORTED_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
  'text/plain',
]

/** Browser execution ID prefix */
export const BROWSER_ID_PREFIX = 'browser_'

/** Content hash algorithm */
export const CONTENT_HASH_ALGORITHM = 'sha256'

/** Minimum content length to consider valid extraction */
export const MIN_CONTENT_LENGTH = 100

/** Readability score threshold (0-1) */
export const READABILITY_THRESHOLD = 0.3

/** Maximum number of chunks per document */
export const MAX_CHUNKS_PER_DOCUMENT = 100

/** Default document language */
export const DEFAULT_LANGUAGE = 'en'

/** Health check interval in milliseconds */
export const HEALTH_CHECK_INTERVAL_MS = 60_000
