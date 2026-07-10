/**
 * SerpAPI Search Provider
 * 
 * Integration with SerpAPI.
 * Aggregates results from multiple search engines.
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

const logger = createLogger('search:provider:serpapi')

const SERPAPI_ENDPOINT = 'https://serpapi.com/search'

/**
 * SerpAPI Search Provider
 */
export class SerpAPISearchProvider extends BaseSearchProvider {
  readonly name = 'serpapi'
  readonly version = '1.0.0'
  readonly description = 'SerpAPI - Multi-engine search aggregation'

  private apiKey: string
  private lastHealthCheck: Date | null = null
  private healthStatus = true

  constructor(apiKey?: string) {
    super()
    this.apiKey = apiKey || process.env.SERPAPI_API_KEY || ''

    if (!this.apiKey) {
      throw new ProviderConfigurationError(
        this.name,
        'SERPAPI_API_KEY environment variable is not set',
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
      logger.error('SerpAPI search failed', { error: err.message })
      throw err
    }
  }

  private async performSearch(request: SearchRequest): Promise<SearchResult[]> {
    const url = new URL(SERPAPI_ENDPOINT)
    url.searchParams.set('q', request.query.query)
    url.searchParams.set('api_key', this.apiKey)
    url.searchParams.set('num', String(request.query.limit ?? 10))
    url.searchParams.set('engine', 'google')

    if (request.query.language) {
      url.searchParams.set('hl', request.query.language)
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'VEXLO-Search-Agent/1.0',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new ProviderAuthenticationError(
          this.name,
          'Invalid SerpAPI key',
        )
      }
      if (response.status === 429) {
        throw new ProviderUnavailableError(
          this.name,
          'SerpAPI rate limit exceeded',
        )
      }
      if (isRetryableHttpError(response.status)) {
        throw new ProviderNetworkError(
          this.name,
          `SerpAPI error: ${response.status}`,
        )
      }
      throw new Error(`SerpAPI error: ${response.status}`)
    }

    const data = (await response.json()) as any

    if (!data.organic_results || !Array.isArray(data.organic_results)) {
      return []
    }

    return data.organic_results.map((result: any, index: number) =>
      buildSearchResult({
        id: `serpapi-${index}`,
        title: result.title || 'Untitled',
        url: result.link || '',
        snippet: result.snippet || '',
        provider: this.name,
        score: 0.8 - index * 0.05,
        metadata: {
          displayedLink: result.displayed_link,
          position: result.position,
        },
      }),
    )
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    try {
      const startTime = performance.now()

      const url = new URL(SERPAPI_ENDPOINT)
      url.searchParams.set('q', 'test')
      url.searchParams.set('api_key', this.apiKey)
      url.searchParams.set('num', '1')

      const response = await fetch(url)

      const durationMs = performance.now() - startTime

      if (response.ok) {
        this.lastHealthCheck = new Date()
        this.healthStatus = true
        return {
          healthy: true,
          message: 'SerpAPI provider is operational',
          authenticated: true,
        }
      }

      if (response.status === 401) {
        this.healthStatus = false
        return {
          healthy: false,
          message: 'SerpAPI authentication failed',
          authenticated: false,
        }
      }

      this.healthStatus = false
      return {
        healthy: false,
        message: `SerpAPI error: ${response.status}`,
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
      maxResultsPerRequest: 100,
      supportedLanguages: ['en'],
      supportedRegions: ['US'],
      supportsDateFilter: false,
      supportsLanguageFilter: true,
      supportsRegionFilter: false,
      averageLatencyMs: 600,
      reliability: 0.98,
      requiresAuthentication: true,
      rateLimit: 100,
    }
  }

  protected isAuthenticated(): boolean {
    return Boolean(this.apiKey) && this.healthStatus
  }
}
