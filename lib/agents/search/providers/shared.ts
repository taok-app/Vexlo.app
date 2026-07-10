/**
 * Shared Provider Utilities
 * 
 * Common functions used across all provider implementations.
 */

import { z } from 'zod'
import type { SearchResult, SearchResultMetadata } from '../types'
import { normalizeUrl, extractDomain } from '../normalization'

/**
 * Configuration schema for all providers
 */
export const ProviderConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  enabled: z.boolean().default(true),
  timeout: z.number().int().min(1000).max(120000).default(30000),
  maxResults: z.number().int().min(1).max(100).default(20),
  language: z.string().default('en'),
  region: z.string().optional(),
})

export type ProviderConfigType = z.infer<typeof ProviderConfigSchema>

/**
 * Search result response schema (generic)
 */
export const SearchResultResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  snippet: z.string(),
  score: z.number().min(0).max(1).optional(),
})

/**
 * Build search result from provider response
 */
export function buildSearchResult(
  data: {
    id: string
    title: string
    url: string
    snippet: string
    provider: string
    score?: number
    author?: string
    publishedAt?: Date
    metadata?: Record<string, unknown>
  },
): SearchResult {
  const normalizedUrl = normalizeUrl(data.url)
  const domain = extractDomain(normalizedUrl)
  const score = data.score ?? 0.7

  return {
    id: normalizedUrl,
    title: data.title.trim(),
    url: normalizedUrl,
    snippet: data.snippet.trim(),
    provider: data.provider,
    domain,
    author: data.author,
    publishedAt: data.publishedAt,
    providerScore: Math.max(0, Math.min(1, score)),
    rankingScore: Math.max(0, Math.min(1, score)),
    metadata: {
      ...data.metadata,
    },
  }
}

/**
 * Parse publication date from various formats
 */
export function parsePublicationDate(dateString?: string | number): Date | undefined {
  if (!dateString) return undefined

  if (typeof dateString === 'number') {
    return new Date(dateString)
  }

  if (typeof dateString === 'string') {
    // Try parsing ISO format
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return date
    }
  }

  return undefined
}

/**
 * Extract domain from URL safely
 */
export function safeDomainExtract(url: string): string {
  try {
    return new URL(url).hostname || url
  } catch {
    return url
  }
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Truncate text to maximum length
 */
export function truncateText(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Map common HTTP error codes to retryable status
 */
export function isRetryableHttpError(statusCode: number): boolean {
  return (
    statusCode === 408 || // Request Timeout
    statusCode === 429 || // Too Many Requests
    statusCode === 500 || // Internal Server Error
    statusCode === 502 || // Bad Gateway
    statusCode === 503 || // Service Unavailable
    statusCode === 504 // Gateway Timeout
  )
}
