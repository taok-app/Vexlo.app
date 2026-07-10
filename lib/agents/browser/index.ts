/**
 * Browser Agent Main Export
 */

export type {
  BrowserRequest,
  PageContent,
  PageMetadata,
  DocumentChunk,
  BrowserResponse,
  BrowserStatistics,
  BrowserCapabilities,
  BrowserMetadata,
  BrowserExecutionContext,
  BrowserErrorInfo,
  ExtractionResult,
  ChunkingOptions,
  CacheEntry,
  BrowserTelemetryEvent,
  BrowserError,
} from './types'

export {
  BrowserProvider,
  type BrowserHealthStatus,
} from './provider'

export {
  FetchError,
  HttpError,
  ExtractionError,
  ContentTooLargeError,
  UnsupportedContentError,
  BrowserTimeoutError,
  BrowserProviderUnavailableError,
  InvalidUrlError,
  ReadabilityError,
} from './errors'

export {
  BaseBrowserProvider,
} from './base'

export {
  BrowserRegistry,
  getBrowserRegistry,
  resetBrowserRegistry,
} from './registry'

export type { BrowserProviderConfig } from './factory'
export {
  BrowserFactory,
  getBrowserFactory,
  resetBrowserFactory,
} from './factory'

export {
  BrowserSelector,
  BrowserSelectionStrategy,
  type BrowserSelectionOptions,
  getBrowserSelector,
  resetBrowserSelector,
} from './selector'

export { BrowserAgent } from './agent'

export {
  BrowserCache,
  getBrowserCache,
  resetBrowserCache,
} from './cache'

export {
  chunkDocument,
  mergeChunks,
} from './chunking'

export {
  BrowserTelemetry,
  browserTelemetry,
} from './telemetry'

export {
  generateBrowserId,
  generateBrowserRequestId,
  calculateContentHash,
  isValidUrl,
  normalizeUrl,
  extractDomain,
  estimateTokenCount,
  detectLanguage,
  estimateReadingTime,
  truncateText,
  cleanWhitespace,
  measureTime,
} from './utils'

export * from './providers'

export {
  DEFAULT_BROWSER_TIMEOUT_MS,
  MAX_BROWSER_TIMEOUT_MS,
  MAX_PAGE_SIZE_BYTES,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  BROWSER_CACHE_TTL_MS,
  MAX_CONCURRENT_BROWSER_REQUESTS,
  SUPPORTED_CONTENT_TYPES,
} from './constants'
