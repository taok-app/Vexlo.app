/**
 * Search Result Deduplication
 * 
 * Removes duplicate results based on URL matching.
 * Designed with extension points for future semantic deduplication.
 */

import type { SearchResult } from './types'
import { normalizeUrl } from './normalization'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:deduplication')

/**
 * Deduplication strategy interface
 */
export interface DeduplicationStrategy {
  /** Check if two results are duplicates */
  isDuplicate(result1: SearchResult, result2: SearchResult): boolean
  /** Get a fingerprint for a result */
  getFingerprint(result: SearchResult): string
}

/**
 * URL-based deduplication (default)
 */
export class UrlDeduplicationStrategy implements DeduplicationStrategy {
  isDuplicate(result1: SearchResult, result2: SearchResult): boolean {
    return normalizeUrl(result1.url) === normalizeUrl(result2.url)
  }

  getFingerprint(result: SearchResult): string {
    return normalizeUrl(result.url)
  }
}

/**
 * Domain-based deduplication (keeps diversity)
 */
export class DomainDeduplicationStrategy implements DeduplicationStrategy {
  private resultsByDomain = new Map<string, SearchResult[]>()
  private maxResultsPerDomain = 3

  constructor(maxResultsPerDomain: number = 3) {
    this.maxResultsPerDomain = maxResultsPerDomain
  }

  isDuplicate(result1: SearchResult, result2: SearchResult): boolean {
    return result1.domain === result2.domain && normalizeUrl(result1.url) === normalizeUrl(result2.url)
  }

  getFingerprint(result: SearchResult): string {
    return `${result.domain}:${normalizeUrl(result.url)}`
  }
}

/**
 * Deduplicate search results using the specified strategy
 */
export function deduplicateResults(
  results: SearchResult[],
  strategy: DeduplicationStrategy = new UrlDeduplicationStrategy(),
): SearchResult[] {
  if (results.length === 0) {
    return []
  }

  const seen = new Set<string>()
  const deduplicated: SearchResult[] = []
  let duplicateCount = 0

  for (const result of results) {
    const fingerprint = strategy.getFingerprint(result)

    if (!seen.has(fingerprint)) {
      seen.add(fingerprint)
      deduplicated.push(result)
    } else {
      duplicateCount++
    }
  }

  if (duplicateCount > 0) {
    logger.debug('Deduplicated results', {
      original: results.length,
      deduplicated: deduplicated.length,
      removed: duplicateCount,
    })
  }

  return deduplicated
}

/**
 * Deduplicate results and track which ones were duplicates
 */
export function deduplicateResultsWithTracking(
  results: SearchResult[],
  strategy: DeduplicationStrategy = new UrlDeduplicationStrategy(),
): {
  results: SearchResult[]
  duplicates: SearchResult[]
  duplicateCount: number
} {
  if (results.length === 0) {
    return { results: [], duplicates: [], duplicateCount: 0 }
  }

  const seen = new Set<string>()
  const deduplicated: SearchResult[] = []
  const duplicates: SearchResult[] = []

  for (const result of results) {
    const fingerprint = strategy.getFingerprint(result)

    if (!seen.has(fingerprint)) {
      seen.add(fingerprint)
      deduplicated.push(result)
    } else {
      duplicates.push(result)
    }
  }

  return {
    results: deduplicated,
    duplicates,
    duplicateCount: duplicates.length,
  }
}

/**
 * Group results by domain for diversity analysis
 */
export function groupResultsByDomain(results: SearchResult[]): Map<string, SearchResult[]> {
  const grouped = new Map<string, SearchResult[]>()

  for (const result of results) {
    const domain = result.domain
    if (!grouped.has(domain)) {
      grouped.set(domain, [])
    }
    grouped.get(domain)!.push(result)
  }

  return grouped
}

/**
 * Ensure result diversity by limiting results per domain
 */
export function ensureDiverseResults(
  results: SearchResult[],
  maxPerDomain: number = 3,
): SearchResult[] {
  const grouped = groupResultsByDomain(results)
  const diverse: SearchResult[] = []

  // Maintain result order while ensuring diversity
  const seen = new Set<string>()
  const domainCounts = new Map<string, number>()

  for (const result of results) {
    const domain = result.domain
    const count = domainCounts.get(domain) ?? 0

    if (count < maxPerDomain) {
      diverse.push(result)
      domainCounts.set(domain, count + 1)
      seen.add(result.id)
    }
  }

  return diverse
}
