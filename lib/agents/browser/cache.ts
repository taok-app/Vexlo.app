/**
 * Browser Cache
 * 
 * In-memory cache for fetched and processed page content.
 */

import type { PageContent, CacheEntry } from './types'
import { calculateContentHash } from './utils'
import { BROWSER_CACHE_TTL_MS } from './constants'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:cache')

/**
 * Browser cache implementation
 */
export class BrowserCache {
  private cache: Map<string, CacheEntry> = new Map()
  private contentHashMap: Map<string, string> = new Map() // Maps content hash to URL

  /**
   * Store content in cache
   */
  set(url: string, content: PageContent, ttlMs: number = BROWSER_CACHE_TTL_MS): void {
    const entry: CacheEntry = {
      content,
      cachedAt: new Date(),
      ttlMs,
    }

    this.cache.set(url, entry)

    // Store content hash for duplicate detection
    const hash = calculateContentHash(content.content)
    this.contentHashMap.set(hash, url)

    logger.debug('Browser cache set', { url })
  }

  /**
   * Retrieve content from cache
   */
  get(url: string): PageContent | null {
    const entry = this.cache.get(url)

    if (!entry) {
      return null
    }

    // Check if entry has expired
    const age = Date.now() - entry.cachedAt.getTime()
    if (age > entry.ttlMs) {
      this.cache.delete(url)
      logger.debug('Browser cache entry expired', { url })
      return null
    }

    logger.debug('Browser cache hit', { url })
    return entry.content
  }

  /**
   * Check if URL is in cache
   */
  has(url: string): boolean {
    const entry = this.cache.get(url)
    if (!entry) return false

    const age = Date.now() - entry.cachedAt.getTime()
    return age <= entry.ttlMs
  }

  /**
   * Check for duplicate content by hash
   */
  findDuplicateUrl(content: string): string | null {
    const hash = calculateContentHash(content)
    return this.contentHashMap.get(hash) ?? null
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now()
    let cleared = 0

    for (const [url, entry] of this.cache.entries()) {
      const age = now - entry.cachedAt.getTime()
      if (age > entry.ttlMs) {
        this.cache.delete(url)
        cleared++
      }
    }

    logger.debug('Browser cache cleared expired entries', { count: cleared })
    return cleared
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.contentHashMap.clear()
    logger.debug('Browser cache cleared')
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: number } {
    let size = 0
    for (const entry of this.cache.values()) {
      size += entry.content.content.length
    }
    return {
      size,
      entries: this.cache.size,
    }
  }
}

/**
 * Global browser cache instance
 */
let globalCache: BrowserCache | null = null

/**
 * Get the global browser cache
 */
export function getBrowserCache(): BrowserCache {
  if (!globalCache) {
    globalCache = new BrowserCache()
  }
  return globalCache
}

/**
 * Reset the global cache (for testing)
 */
export function resetBrowserCache(): void {
  globalCache = null
}
