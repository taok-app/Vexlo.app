/**
 * Search Result Normalization
 * 
 * Converts provider-specific results into the unified SearchResult schema.
 */

import type { SearchResult, SearchResultMetadata } from './types'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:normalization')

/**
 * Normalize a URL by removing trailing slashes and fragments
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Remove trailing slash unless it's the root
    let normalized = parsed.href
    if (normalized.endsWith('/') && parsed.pathname !== '/') {
      normalized = normalized.slice(0, -1)
    }
    // Remove fragment
    normalized = normalized.split('#')[0]
    return normalized
  } catch (error) {
    logger.warn('Failed to normalize URL', { url, error })
    return url
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname || parsed.origin
  } catch (error) {
    logger.warn('Failed to extract domain', { url, error })
    return url
  }
}

/**
 * Validate and normalize search result
 */
export function normalizeSearchResult(
  id: string,
  title: string,
  url: string,
  snippet: string,
  provider: string,
  providerScore: number,
  metadata: Partial<SearchResultMetadata> = {},
): SearchResult {
  const normalizedUrl = normalizeUrl(url)
  const domain = extractDomain(normalizedUrl)

  // Ensure score is between 0 and 1
  const normalizedScore = Math.max(0, Math.min(1, providerScore))

  return {
    id: normalizedUrl, // Use normalized URL as ID
    title: title.trim(),
    url: normalizedUrl,
    snippet: snippet.trim(),
    provider,
    domain,
    providerScore: normalizedScore,
    rankingScore: normalizedScore, // Will be updated by ranking engine
    metadata: {
      contentType: metadata.contentType,
      readingTime: metadata.readingTime,
      verified: metadata.verified ?? false,
      ...Object.fromEntries(
        Object.entries(metadata).filter(([key]) => !['contentType', 'readingTime', 'verified'].includes(key)),
      ),
    },
  }
}

/**
 * Normalize an array of results
 */
export function normalizeSearchResults(
  results: Array<{
    id: string
    title: string
    url: string
    snippet: string
    provider: string
    providerScore: number
    metadata?: Partial<SearchResultMetadata>
  }>,
  provider: string,
): SearchResult[] {
  return results.map((result) =>
    normalizeSearchResult(
      result.id,
      result.title,
      result.url,
      result.snippet,
      result.provider || provider,
      result.providerScore,
      result.metadata,
    ),
  )
}

/**
 * Check if a result is complete (has all required fields)
 */
export function isCompleteResult(result: SearchResult): boolean {
  return (
    Boolean(result.id) &&
    Boolean(result.title) &&
    Boolean(result.url) &&
    Boolean(result.snippet) &&
    Boolean(result.provider) &&
    Boolean(result.domain) &&
    result.providerScore >= 0 &&
    result.providerScore <= 1
  )
}

/**
 * Filter out incomplete results
 */
export function filterCompleteResults(results: SearchResult[]): SearchResult[] {
  return results.filter((result) => {
    if (!isCompleteResult(result)) {
      logger.warn('Filtering incomplete result', { id: result.id, url: result.url })
      return false
    }
    return true
  })
}
