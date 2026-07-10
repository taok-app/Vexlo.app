/**
 * Firecrawl Search Provider
 * 
 * Integration with Firecrawl Search API.
 * Note: This implements search only, not crawling.
 * Crawling functionality belongs to Browser Agent (Milestone 5.2).
 */

import type { SearchRequest, SearchResult, ProviderCapabilities } from '../types'
import { BaseSearchProvider } from './base-provider'
import type { ProviderHealthStatus } from '../provider'
import {
  ProviderAuthenticationError,
  ProviderNetworkError,
  ProviderConfigurationError,
  ProviderUnavailableError,
} from '../provider'
import { buildSearchResult, parsePublicationDate, isRetryableHttpError } from './shared'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:provider:firecrawl')

const FIRECRAWL_API_ENDPOINT = 'https://api.firecrawl.dev/v1/search'

/**
 * Firecrawl Search Provider
 * 
 * Note: This provider implements search only.
 * Crawling and page extraction are implemented in the Browser Agent (Milestone 5.2).
 */
export class FirecrawlSearchProvider extends BaseSearchProvider {
  readonly name = 'firecrawl'
  readonly version = '1.0.0'
  readonly description = 'Firecrawl Search - Web search with AI parsing'

  private apiKey: string
  private lastHealthCheck: Date | null = null
  private healthStatus = true

  constructor(apiKey?: string) {
    super()
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || ''

    if (!this.apiKey) {
      throw new ProviderConfigurationError(
        this.name,
        'FIRECRAWL_API_KEY environment variable is not set',
      )
    }
  }

  async search(request: SearchRequest): Promise<SearchResult[]> {
    this.validateRequest(request)

    const startTime = performance.now()

    try {
      const results = await this.executeRequest(
        () => this.performSearch(request),
        request.timeoutMs,
      )

      const durationMs = performance.now() - startTime
      this.logMetrics('search', durationMs, { resultCount: results.length })

      return results
    } catch (error) {
      const err = this.mapError(error)
      logger.error('Firecrawl search failed', { error: err.message })
      throw err
    }
  }

  private async performSearch(request: SearchRequest): Promise<SearchResult[]> {
    const response = await fetch(FIRECRAWL_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({
        query: request.query.query,
        limit: request.query.limit ?? 10,
        language: request.query.language ?? 'en',
      }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new ProviderAuthenticationError(
          this.name,
          'Invalid Firecrawl API key',
        )
      }
      if (response.status === 429) {
        throw new ProviderUnavailableError(
          this.name,
          'Firecrawl rate limit exceeded',
        )
      }
      if (isRetryableHttpError(response.status)) {
        throw new ProviderNetworkError(
          this.name,
          `Firecrawl API error: ${response.status}`,
        )
      }
      throw new Error(`Firecrawl API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    if (!data.data || !Array.isArray(data.data)) {
      return []
    }

    return data.data.map((result: any, index: number) =>
      buildSearchResult({
        id: `firecrawl-${index}`,
        title: result.title || 'Untitled',
        url: result.url || '',
        snippet: result.description || result.excerpt || '',
        provider: this.name,
        score: result.relevance_score || 0.7,
        publishedAt: parsePublicationDate(result.published_date),
        metadata: {
          domain: result.domain,
          contentType: result.type,
        },
      }),
    )
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    try {
      const startTime = performance.now()

      const response = await fetch(FIRECRAWL_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          query: 'test',
          limit: 1,
        }),
      })

      const durationMs = performance.now() - startTime

      if (response.ok) {
        this.lastHealthCheck = new Date()
        this.healthStatus = true
        return {
          healthy: true,
          message: 'Firecrawl provider is operational',
          authenticated: true,
        }
      }

      if (response.status === 401) {
        this.healthStatus = false
        return {
          healthy: false,
          message: 'Firecrawl authentication failed',
          authenticated: false,
        }
      }

      this.healthStatus = false
      return {
        healthy: false,
        message: `Firecrawl API error: ${response.status}`,
        authenticated: true,
      }
    } catch (error) {
      this.healthStatus = false
      return {
        healthy: false,
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        authenticated: false,
      }
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxResultsPerRequest: 50,
      supportedLanguages: ['en'],
      supportedRegions: ['US'],
      supportsDateFilter: true,
      supportsLanguageFilter: true,
      supportsRegionFilter: false,
      averageLatencyMs: 1200,
      reliability: 0.97,
      requiresAuthentication: true,
      rateLimit: 50,
    }
  }

  protected isAuthenticated(): boolean {
    return Boolean(this.apiKey) && this.healthStatus
  }
}
