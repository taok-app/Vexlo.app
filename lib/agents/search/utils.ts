/**
 * Search Agent Utilities
 */

import { nanoid } from 'nanoid'
import { SEARCH_ID_PREFIX } from './constants'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:utils')

/**
 * Generate a unique search execution ID
 */
export function generateSearchId(): string {
  return `${SEARCH_ID_PREFIX}${nanoid()}`
}

/**
 * Generate a unique request ID for a provider
 */
export function generateRequestId(): string {
  return `req_${nanoid()}`
}

/**
 * Parse a search query string and extract parameters
 */
export function parseSearchQuery(queryString: string): {
  query: string
  filters: Record<string, string>
} {
  const parts = queryString.trim().split(' ')
  const filters: Record<string, string> = {}
  const queryParts: string[] = []

  for (const part of parts) {
    if (part.includes(':')) {
      const [key, value] = part.split(':', 2)
      filters[key] = value
    } else {
      queryParts.push(part)
    }
  }

  return {
    query: queryParts.join(' '),
    filters,
  }
}

/**
 * Format a search query with filters
 */
export function formatSearchQuery(
  query: string,
  filters?: Record<string, unknown>,
): string {
  let formatted = query

  if (filters) {
    const filterParts = Object.entries(filters)
      .map(([key, value]) => `${key}:${value}`)
      .join(' ')
    formatted = `${query} ${filterParts}`.trim()
  }

  return formatted
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(
  text: string,
  maxLength: number = 200,
  suffix: string = '...',
): string {
  if (text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength - suffix.length) + suffix
}

/**
 * Escape special characters for search queries
 */
export function escapeSearchQuery(query: string): string {
  // Escape special regex characters
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Measure function execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now()
  const result = await fn()
  const durationMs = performance.now() - start
  return { result, durationMs }
}

/**
 * Chunk an array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
