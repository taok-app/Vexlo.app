/** Browser Agent types shared by retrieval providers and consumers. */

export interface BrowserRequest {
  requestId: string
  url: string
  timeoutMs?: number
  provider?: string
  signal?: AbortSignal
  context?: Record<string, unknown>
}

export interface RawBrowserDocument {
  requestUrl: string
  finalUrl: string
  statusCode: number
  headers: Record<string, string>
  contentType: string
  charset: string
  html: string
  responseSize: number
  fetchedAt: Date
  provider: string
  duration: number
}

/** Legacy extraction contracts retained for Commit 2 compatibility. */
export interface PageMetadata {
  canonicalUrl?: string
  originalUrl: string
  title: string
  description?: string
  author?: string
  publisher?: string
  publishedAt?: Date
  lastModified?: Date
  language?: string
  keywords?: string[]
  image?: string
  type?: string
}

export interface PageContent {
  title: string
  content: string
  rawHtml?: string
  metadata: PageMetadata
  language?: string
  readingTimeMinutes?: number
}

export interface DocumentChunk {
  id: string
  sourceUrl: string
  index: number
  content: string
  estimatedTokens: number
  headingPath?: string[]
  overlapWithPrevious?: string
  metadata: PageMetadata
}

export interface ExtractionResult {
  success: boolean
  content?: PageContent
  error?: Error
  durationMs: number
}

export interface ChunkingOptions {
  chunkSize: number
  overlapSize: number
  respectParagraphs: boolean
  respectHeadings: boolean
}

export interface CacheEntry {
  content: PageContent
  cachedAt: Date
  ttlMs: number
}

export interface BrowserResponse {
  browserId: string
  url: string
  document: RawBrowserDocument
  statistics: BrowserStatistics
  success: true
}

export interface BrowserStatistics {
  totalDurationMs: number
  fetchDurationMs: number
  contentSizeBytes: number
  statusCode: number
}

export interface BrowserCapabilities {
  maxPageSizeBytes: number
  supportedContentTypes: string[]
  supportsJavaScript: boolean
  supportsCSS: boolean
  returnsMarkdown: boolean
  averageLatencyMs: number
  reliability: number
  requiresAuthentication: boolean
}

export interface BrowserMetadata {
  name: string
  version: string
  description: string
  authenticated: boolean
  healthy: boolean
  lastHealthCheck?: Date
  capabilities: BrowserCapabilities
}

export interface BrowserExecutionContext {
  executionId: string
  organizationId?: string
  userId?: string
  timeoutMs?: number
  signal?: AbortSignal
  context?: Record<string, unknown>
}

export interface BrowserErrorInfo {
  code: string
  message: string
  timestamp: Date
  retryable: boolean
}

export type BrowserTelemetryEventType =
  | 'fetch_started'
  | 'fetch_completed'
  | 'fetch_redirected'
  | 'fetch_retried'
  | 'fetch_timeout'
  | 'browser_error'

export interface BrowserTelemetryEvent {
  type: BrowserTelemetryEventType
  timestamp: Date
  provider?: string
  durationMs?: number
  responseSize?: number
  statusCode?: number
  redirectCount?: number
  retryCount?: number
  timeoutCount?: number
  failureCount?: number
  error?: BrowserErrorInfo
  metadata?: Record<string, unknown>
}

export class BrowserError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable = false,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'BrowserError'
  }
}
