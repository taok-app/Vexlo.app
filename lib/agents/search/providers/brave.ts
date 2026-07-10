/**
 * Brave Search Provider
 * 
 * Integration with Brave Search API.
 * Provides privacy-focused search results.
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

const logger = createLogger('search:provider:brave')

const BRAVE_API_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search'

/**
 * Brave Search Provider
 */
export class BraveSearchProvider extends BaseSearchProvider {
  readonly name = 'brave'
  readonly version = '1.0.0'
  readonly description = 'Brave Search - Privacy-focused search engine'

  private apiKey: string
  private lastHealthCheck: Date | null = null
  private healthStatus = true

  constructor(apiKey?: string) {
    super()
    this.apiKey = apiKey || process.env.BRAVE_SEARCH_API_KEY || ''

    if (!this.apiKey) {
      throw new ProviderConfigurationError(
        this.name,
        'BRAVE_SEARCH_API_KEY environment variable is not set',
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
      logger.error('Brave search failed', { error: err.message })
      throw err
    }
  }

  private async performSearch(request: SearchRequest): Promise<SearchResult[]> {
    const url = new URL(BRAVE_API_ENDPOINT)
    url.searchParams.set('q', request.query.query)
    url.searchParams.set('count', String(request.query.limit ?? 10))

    if (request.query.language) {
      url.searchParams.set('lang', request.query.language)
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': this.apiKey,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new ProviderAuthenticationError(
          this.name,
          'Invalid Brave Search API key',
        )
      }
      if (response.status === 429) {
        throw new ProviderUnavailableError(
          this.name,
          'Brave rate limit exceeded',
        )
      }
      if (isRetryableHttpError(response.status)) {
        throw new ProviderNetworkError(
          this.name,
          `Brave API error: ${response.status}`,
        )
      }
      throw new Error(`Brave API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    if (!data.web || !Array.isArray(data.web)) {
      return []
    }

    return data.web.map((result: any, index: number) =>
      buildSearchResult({
        id: `brave-${index}`,
        title: result.title || 'Untitled',
        url: result.url || '',
        snippet: result.description || '',
        provider: this.name,
        score: 0.75,
        metadata: {
          language: result.language,
          isFamilyFriendly: result.family_friendly,
        },
      }),
    )
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    try {
      const startTime = performance.now()

      const url = new URL(BRAVE_API_ENDPOINT)
      url.searchParams.set('q', 'health')
      url.searchParams.set('count', '1')

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': this.apiKey,
        },
      })

      const durationMs = performance.now() - startTime

      if (response.ok) {
        this.lastHealthCheck = new Date()
        this.healthStatus = true
        return {
          healthy: true,
          message: 'Brave provider is operational',
          authenticated: true,
        }
      }

      if (response.status === 401) {
        this.healthStatus = false
        return {
          healthy: false,
          message: 'Brave authentication failed',
          authenticated: false,
        }
      }

      this.healthStatus = false
      return {
        healthy: false,
        message: `Brave API error: ${response.status}`,
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
      supportsRegionFilter: false,
      averageLatencyMs: 400,
      reliability: 0.99,
      requiresAuthentication: true,
      rateLimit: 100,
    }
  }

  protected isAuthenticated(): boolean {
    return Boolean(this.apiKey) && this.healthStatus
  }
}
