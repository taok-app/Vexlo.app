/**
 * Browser Utilities
 */

import { createHash } from 'crypto'
import { nanoid } from 'nanoid'
import { BROWSER_ID_PREFIX } from './constants'

/**
 * Generate a unique browser execution ID
 */
export function generateBrowserId(): string {
  return `${BROWSER_ID_PREFIX}${nanoid()}`
}

/**
 * Generate a unique request ID
 */
export function generateBrowserRequestId(): string {
  return `breq_${nanoid()}`
}

/**
 * Calculate content hash
 */
export function calculateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
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
 * Normalize URL
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    let normalized = parsed.href
    if (normalized.endsWith('/') && parsed.pathname !== '/') {
      normalized = normalized.slice(0, -1)
    }
    // Remove fragment
    normalized = normalized.split('#')[0]
    return normalized
  } catch {
    return url
  }
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname || url
  } catch {
    return url
  }
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Detect content language from text
 */
export function detectLanguage(text: string): string {
  // Placeholder: just return 'en' for now
  // Future: integrate with language detection library
  return 'en'
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(text: string): number {
  const wordCount = text.split(/\s+/).length
  const avgWordsPerMinute = 200
  return Math.max(1, Math.ceil(wordCount / avgWordsPerMinute))
}

/**
 * Truncate text to maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Clean whitespace
 */
export function cleanWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single
    .trim()
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
