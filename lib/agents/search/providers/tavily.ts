/**
 * Tavily Search Provider
 * 
 * Integration with Tavily Search API.
 * Focus on providing accurate, recent, and relevant search results.
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
import { buildSearchResult, isRetryableHttpError } from './shared'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:provider:tavily')

const TAVILY_API_ENDPOINT = 'https://api.tavily.com/search'
const TAVILY_HEALTH_CHECK_ENDPOINT = 'https://api.tavily.com/health'

/**
 * Tavily Search Provider
 */
export class TavilySearchProvider extends BaseSearchProvider {
  readonly name = 'tavily'
  readonly version = '1.0.0'
  readonly description = 'Tavily Search - High-quality search results with focus on relevance'

  private apiKey: string
  private lastHealthCheck: Date | null = null
  private healthStatus = true

  constructor(apiKey?: string) {
    super()
    this.apiKey = apiKey || process.env.TAVILY_API_KEY || ''

    if (!this.apiKey) {
      throw new ProviderConfigurationError(
        this.name,
        'TAVILY_API_KEY environment variable is not set',
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
      logger.error('Tavily search failed', { error: err.message })
      throw err
    }
  }

  private async performSearch(request: SearchRequest): Promise<SearchResult[]> {
    const response = await fetch(TAVILY_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query: request.query.query,
        max_results: request.query.limit ?? 10,
        include_answer: false,
        include_raw_content: false,
        search_depth: 'basic',
      }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new ProviderAuthenticationError(
          this.name,
          'Invalid Tavily API key',
        )
      }
      if (response.status === 429) {
        throw new ProviderUnavailableError(
          this.name,
          'Tavily rate limit exceeded',
        )
      }
      if (isRetryableHttpError(response.status)) {
        throw new ProviderNetworkError(
          this.name,
          `Tavily API error: ${response.status}`,
        )
      }
      throw new Error(`Tavily API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    if (!data.results || !Array.isArray(data.results)) {
      return []
    }

    return data.results.map((result: any, index: number) =>
      buildSearchResult({
        id: `tavily-${index}`,
        title: result.title || 'Untitled',
        url: result.url || '',
        snippet: result.content || '',
        provider: this.name,
        score: 0.8,
        metadata: {
          source: result.source,
        },
      }),
    )
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    try {
      const startTime = performance.now()

      const response = await fetch(TAVILY_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: this.apiKey,
          query: 'test',
          max_results: 1,
        }),
      })

      const durationMs = performance.now() - startTime

      if (response.ok) {
        this.lastHealthCheck = new Date()
        this.healthStatus = true
        return {
          healthy: true,
          message: 'Tavily provider is operational',
          authenticated: true,
        }
      }

      if (response.status === 401) {
        this.healthStatus = false
        return {
          healthy: false,
          message: 'Tavily authentication failed',
          authenticated: false,
        }
      }

      this.healthStatus = false
      return {
        healthy: false,
        message: `Tavily API error: ${response.status}`,
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
      maxResultsPerRequest: 20,
      supportedLanguages: ['en'],
      supportedRegions: ['US'],
      supportsDateFilter: false,
      supportsLanguageFilter: true,
      supportsRegionFilter: true,
      averageLatencyMs: 500,
      reliability: 0.99,
      requiresAuthentication: true,
      rateLimit: 100,
    }
  }

  protected isAuthenticated(): boolean {
    return Boolean(this.apiKey) && this.healthStatus
  }
}
