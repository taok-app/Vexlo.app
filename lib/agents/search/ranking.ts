/**
 * Search Result Ranking
 * 
 * Deterministic ranking algorithm using weighted scoring.
 * Considers: provider confidence, freshness, domain authority, completeness.
 */

import type { SearchResult } from './types'
import {
  RANKING_WEIGHT_PROVIDER_SCORE,
  RANKING_WEIGHT_FRESHNESS,
  RANKING_WEIGHT_DOMAIN_AUTHORITY,
  RANKING_WEIGHT_COMPLETENESS,
  RANKING_WEIGHT_DUPLICATE_PENALTY,
  FRESHNESS_MAX_DAYS,
  STALE_RESULT_SCORE,
} from './constants'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:ranking')

/**
 * Calculate freshness score based on publication date
 */
export function calculateFreshnessScore(publishedAt?: Date): number {
  if (!publishedAt) {
    return 0.5 // Medium score for unknown dates
  }

  const now = new Date()
  const ageMs = now.getTime() - publishedAt.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)

  if (ageDays < 0) {
    return 1.0 // Future dates get highest score (shouldn't happen)
  }

  if (ageDays > FRESHNESS_MAX_DAYS) {
    return STALE_RESULT_SCORE
  }

  // Linear decay from 1.0 to STALE_RESULT_SCORE over FRESHNESS_MAX_DAYS
  const freshness = 1.0 - (ageDays / FRESHNESS_MAX_DAYS) * (1.0 - STALE_RESULT_SCORE)
  return Math.max(STALE_RESULT_SCORE, Math.min(1.0, freshness))
}

/**
 * Calculate domain authority score
 * 
 * Currently returns a placeholder value.
 * Future versions will integrate with domain reputation service.
 */
export function calculateDomainAuthorityScore(domain: string): number {
  // Placeholder: known authoritative domains
  const authorityDomains = [
    'wikipedia.org',
    'github.com',
    'stackoverflow.com',
    'arxiv.org',
    'scholar.google.com',
    '.edu',
    '.gov',
  ]

  const isAuthoritative = authorityDomains.some(
    (auth) => domain.endsWith(auth) || domain.includes(auth),
  )

  return isAuthoritative ? 0.8 : 0.5
}

/**
 * Calculate completeness score based on result metadata
 */
export function calculateCompletenessScore(result: SearchResult): number {
  let score = 0.5 // Base score

  if (result.title && result.title.length > 10) score += 0.1
  if (result.snippet && result.snippet.length > 50) score += 0.1
  if (result.author) score += 0.05
  if (result.publishedAt) score += 0.1
  if (result.language) score += 0.05

  return Math.min(1.0, score)
}

/**
 * Calculate duplicate penalty score
 * 
 * Results that appear in multiple searches get a slight penalty
 * (they're less unique but potentially more important)
 */
export function calculateDuplicatePenalty(
  result: SearchResult,
  duplicateCount: number,
): number {
  if (duplicateCount === 0) {
    return 1.0 // No penalty
  }

  // Penalty scales with duplicate count, max -0.15
  const penalty = Math.min(0.15, duplicateCount * 0.05)
  return Math.max(0.85, 1.0 - penalty)
}

/**
 * Rank search results using weighted scoring
 */
export function rankResults(
  results: SearchResult[],
  options: {
    weights?: {
      providerScore?: number
      freshness?: number
      domainAuthority?: number
      completeness?: number
      duplicatePenalty?: number
    }
  } = {},
): SearchResult[] {
  if (results.length === 0) {
    return []
  }

  const weights = {
    providerScore: options.weights?.providerScore ?? RANKING_WEIGHT_PROVIDER_SCORE,
    freshness: options.weights?.freshness ?? RANKING_WEIGHT_FRESHNESS,
    domainAuthority: options.weights?.domainAuthority ?? RANKING_WEIGHT_DOMAIN_AUTHORITY,
    completeness: options.weights?.completeness ?? RANKING_WEIGHT_COMPLETENESS,
    duplicatePenalty: options.weights?.duplicatePenalty ?? RANKING_WEIGHT_DUPLICATE_PENALTY,
  }

  // Normalize weights
  const totalWeight =
    weights.providerScore +
    weights.freshness +
    weights.domainAuthority +
    weights.completeness +
    weights.duplicatePenalty

  const normalizedWeights = {
    providerScore: weights.providerScore / totalWeight,
    freshness: weights.freshness / totalWeight,
    domainAuthority: weights.domainAuthority / totalWeight,
    completeness: weights.completeness / totalWeight,
    duplicatePenalty: weights.duplicatePenalty / totalWeight,
  }

  // Calculate scores
  const scoredResults = results.map((result) => {
    const providerScore = result.providerScore
    const freshnessScore = calculateFreshnessScore(result.publishedAt)
    const authorityScore = calculateDomainAuthorityScore(result.domain)
    const completenessScore = calculateCompletenessScore(result)
    const duplicatePenalty = calculateDuplicatePenalty(result, 0) // TODO: track duplicates

    const rankingScore =
      providerScore * normalizedWeights.providerScore +
      freshnessScore * normalizedWeights.freshness +
      authorityScore * normalizedWeights.domainAuthority +
      completenessScore * normalizedWeights.completeness +
      duplicatePenalty * normalizedWeights.duplicatePenalty

    return {
      ...result,
      rankingScore: Math.max(0, Math.min(1, rankingScore)),
    }
  })

  // Sort by ranking score (descending)
  return scoredResults.sort((a, b) => b.rankingScore - a.rankingScore)
}

/**
 * Rank results and return top N
 */
export function getTopRankedResults(
  results: SearchResult[],
  limit: number = 20,
): SearchResult[] {
  return rankResults(results).slice(0, limit)
}
