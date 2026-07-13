import type { RawBrowserDocument } from '@/lib/agents/browser'
import type { SearchResult } from '@/lib/agents/search/types'
import type { SearchTask } from '@/lib/research/search'

export type NormalizedScore = number

export interface SourceQuality {
  completeness: NormalizedScore
  freshness: NormalizedScore
  authority: NormalizedScore
  extractionConfidence: NormalizedScore
  overall: NormalizedScore
}

export interface ExtractedPage {
  title: string
  content: string
  headings: string[]
  author?: string
  publishedAt?: Date
  modifiedAt?: Date
  canonicalUrl?: string
  description?: string
  language?: string
  metadata: Record<string, string>
}

export interface RetrievedSource extends ExtractedPage {
  id: string
  taskId: string
  query: string
  url: string
  originalUrl: string
  domain: string
  fetchedAt: Date
  contentType: string
  contentSizeBytes: number
  searchRank: number
  searchScore: number
  quality: SourceQuality
}

export interface BrowserTaskResult {
  taskId: string
  query: string
  sources: RetrievedSource[]
  errors: BrowserAgentErrorInfo[]
  durationMs: number
}

export interface BrowserRunMetadata {
  durationMs: number
  tasksExecuted: number
  urlsConsidered: number
  sourcesRetrieved: number
  cacheHits: number
  robotsDenied: number
  failures: number
}

export interface BrowserRunResult {
  results: BrowserTaskResult[]
  sources: RetrievedSource[]
  metadata: BrowserRunMetadata
}

export interface BrowserAgentOptions {
  resultsPerTask?: number
  maxSourcesPerTask?: number
  concurrency?: number
  timeoutMs?: number
  cacheTtlMs?: number
  respectRobots?: boolean
  userAgent?: string
}

export interface ResearchSearchExecutor {
  search(query: { query: string; limit?: number; language?: string }): Promise<{ results: SearchResult[] }>
}

export interface ResearchPageFetcher {
  fetch(url: string, options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<RawBrowserDocument>
}

export interface RobotsPolicy {
  isAllowed(url: string, userAgent?: string): Promise<boolean>
}

export interface CacheInvalidationEvent<T> {
  key: string
  reason: 'expired' | 'deleted' | 'cleared' | 'replaced'
  value?: T
}

export interface ResearchCache<T> {
  get(key: string): T | undefined
  set(key: string, value: T, ttlMs?: number): void
  delete(key: string): boolean
  clear(): void
  makeKey(value: string): string
}

export interface BrowserAgentDependencies {
  search: ResearchSearchExecutor
  fetcher?: ResearchPageFetcher
  robots?: RobotsPolicy
  cache?: ResearchCache<RetrievedSource>
}

export interface BrowserValidationIssue {
  code: string
  message: string
  field?: string
}

export interface BrowserValidationResult {
  valid: boolean
  errors: BrowserValidationIssue[]
  warnings: BrowserValidationIssue[]
}

export enum BrowserAgentErrorCode {
  INVALID_TASK = 'INVALID_TASK',
  INVALID_URL = 'INVALID_URL',
  ROBOTS_DENIED = 'ROBOTS_DENIED',
  FETCH_FAILED = 'FETCH_FAILED',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  EMPTY_CONTENT = 'EMPTY_CONTENT',
  UNSUPPORTED_CONTENT = 'UNSUPPORTED_CONTENT',
  OVERSIZED_RESPONSE = 'OVERSIZED_RESPONSE',
}

export interface BrowserAgentErrorInfo {
  code: BrowserAgentErrorCode
  message: string
  taskId?: string
  url?: string
  retryable: boolean
}

export class ResearchBrowserError extends Error {
  constructor(
    public readonly code: BrowserAgentErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message)
    this.name = 'ResearchBrowserError'
  }
}

export type { RawBrowserDocument, SearchResult, SearchTask }
