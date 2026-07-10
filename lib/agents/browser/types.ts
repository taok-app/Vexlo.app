/**
 * Browser Agent Types
 * 
 * Defines all TypeScript models and interfaces for the Browser Agent layer.
 * All providers must conform to these types.
 */

/**
 * Browser request to fetch and extract page content
 */
export interface BrowserRequest {
  /** Unique request ID for tracking */
  requestId: string
  /** URL to fetch */
  url: string
  /** Request timeout in milliseconds */
  timeoutMs: number
  /** Browser provider name */
  provider: string
  /** Additional context */
  context?: Record<string, unknown>
}

/**
 * Extracted page content
 */
export interface PageContent {
  /** Normalized page title */
  title: string
  /** Cleaned article/main content in Markdown */
  content: string
  /** HTML snippet for reference */
  rawHtml?: string
  /** Extracted metadata */
  metadata: PageMetadata
  /** Content language */
  language?: string
  /** Estimated reading time in minutes */
  readingTimeMinutes?: number
}

/**
 * Extracted page metadata
 */
export interface PageMetadata {
  /** Canonical URL */
  canonicalUrl?: string
  /** Original URL */
  originalUrl: string
  /** Page title */
  title: string
  /** Meta description */
  description?: string
  /** Article/content author */
  author?: string
  /** Publisher/domain */
  publisher?: string
  /** Publication date */
  publishedAt?: Date
  /** Last modified date */
  lastModified?: Date
  /** Page language */
  language?: string
  /** Meta keywords */
  keywords?: string[]
  /** Open Graph image */
  image?: string
  /** Open Graph type */
  type?: string
}

/**
 * Document chunk for processing
 */
export interface DocumentChunk {
  /** Unique chunk ID */
  id: string
  /** Source URL */
  sourceUrl: string
  /** Chunk index */
  index: number
  /** Chunk content */
  content: string
  /** Estimated token count */
  estimatedTokens: number
  /** Current heading path (e.g., ["H1", "H2"]) */
  headingPath?: string[]
  /** Overlap with previous chunk */
  overlapWithPrevious?: string
  /** Metadata reference */
  metadata: PageMetadata
}

/**
 * Browser response after processing
 */
export interface BrowserResponse {
  /** Unique browser execution ID */
  browserId: string
  /** Original URL requested */
  url: string
  /** Page content */
  content: PageContent
  /** Document chunks */
  chunks: DocumentChunk[]
  /** Extraction statistics */
  statistics: BrowserStatistics
  /** Whether result came from cache */
  fromCache: boolean
  /** Success status */
  success: boolean
  /** Error (if failed) */
  error?: BrowserError
}

/**
 * Browser execution statistics
 */
export interface BrowserStatistics {
  /** Total execution time in milliseconds */
  totalDurationMs: number
  /** Time to fetch page */
  fetchDurationMs: number
  /** Time to extract content */
  extractionDurationMs: number
  /** Time to convert to Markdown */
  markdownDurationMs: number
  /** Time to generate chunks */
  chunkingDurationMs: number
  /** Number of chunks generated */
  chunkCount: number
  /** Total content size in bytes */
  contentSizeBytes: number
  /** HTTP status code */
  statusCode?: number
  /** Whether content was deduplicated */
  isDuplicate: boolean
}

/**
 * Browser provider capabilities
 */
export interface BrowserCapabilities {
  /** Maximum page size to handle */
  maxPageSizeBytes: number
  /** Supported content types */
  supportedContentTypes: string[]
  /** Whether provider can execute JavaScript */
  supportsJavaScript: boolean
  /** Whether provider can render CSS */
  supportsCSS: boolean
  /** Whether provider returns Markdown */
  returnsMarkdown: boolean
  /** Average latency in milliseconds */
  averageLatencyMs: number
  /** Provider reliability (0-1) */
  reliability: number
  /** Whether provider requires authentication */
  requiresAuthentication: boolean
}

/**
 * Browser provider metadata
 */
export interface BrowserMetadata {
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
  capabilities: BrowserCapabilities
}

/**
 * Browser execution context
 */
export interface BrowserExecutionContext {
  /** Unique execution ID */
  executionId: string
  /** Organization ID */
  organizationId?: string
  /** User ID */
  userId?: string
  /** Request timeout override */
  timeoutMs?: number
  /** Custom context */
  context?: Record<string, unknown>
}

/**
 * Browser error information
 */
export interface BrowserErrorInfo {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Timestamp */
  timestamp: Date
  /** Whether error is retryable */
  retryable: boolean
}

/**
 * Browser extraction result
 */
export interface ExtractionResult {
  /** Success status */
  success: boolean
  /** Extracted content */
  content?: PageContent
  /** Error (if failed) */
  error?: Error
  /** Extraction duration */
  durationMs: number
}

/**
 * Browser chunking options
 */
export interface ChunkingOptions {
  /** Chunk size in characters */
  chunkSize: number
  /** Overlap between chunks in characters */
  overlapSize: number
  /** Whether to respect paragraph boundaries */
  respectParagraphs: boolean
  /** Whether to respect heading boundaries */
  respectHeadings: boolean
}

/**
 * Browser cache entry
 */
export interface CacheEntry {
  /** Cached content */
  content: PageContent
  /** Timestamp when cached */
  cachedAt: Date
  /** Time to live in milliseconds */
  ttlMs: number
}

/**
 * Browser telemetry event
 */
export interface BrowserTelemetryEvent {
  /** Event type */
  type: 'fetch_started' | 'fetch_completed' | 'extraction_completed' | 'browser_error'
  /** Timestamp */
  timestamp: Date
  /** Provider name */
  provider?: string
  /** Duration in milliseconds */
  durationMs?: number
  /** Content size */
  contentSize?: number
  /** Error details */
  error?: {
    code: string
    message: string
  }
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Browser error base
 */
export class BrowserError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean = false,
  ) {
    super(message)
    this.name = 'BrowserError'
  }
}
