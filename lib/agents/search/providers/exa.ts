/**
 * Exa Search Provider
 * 
 * Integration with Exa Search API.
 * Provides deep web search with neural retrieval.
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

const logger = createLogger('search:provider:exa')

const EXA_API_ENDPOINT = 'https://api.exa.ai/search'

/**
 * Exa Search Provider
 */
export class ExaSearchProvider extends BaseSearchProvider {
  readonly name = 'exa'
  readonly version = '1.0.0'
  readonly description = 'Exa Search - Neural search with deep web access'

  private apiKey: string
  private lastHealthCheck: Date | null = null
  private healthStatus = true

  constructor(apiKey?: string) {
    super()
    this.apiKey = apiKey || process.env.EXA_API_KEY || ''

    if (!this.apiKey) {
      throw new ProviderConfigurationError(
        this.name,
        'EXA_API_KEY environment variable is not set',
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
      logger.error('Exa search failed', { error: err.message })
      throw err
    }
  }

  private async performSearch(request: SearchRequest): Promise<SearchResult[]> {
    const response = await fetch(EXA_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        query: request.query.query,
        numResults: request.query.limit ?? 10,
        type: 'neural',
        useAutoprompt: true,
        language: request.query.language ?? 'en',
      }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new ProviderAuthenticationError(
          this.name,
          'Invalid Exa API key',
        )
      }
      if (response.status === 429) {
        throw new ProviderUnavailableError(
          this.name,
          'Exa rate limit exceeded',
        )
      }
      if (isRetryableHttpError(response.status)) {
        throw new ProviderNetworkError(
          this.name,
          `Exa API error: ${response.status}`,
        )
      }
      throw new Error(`Exa API error: ${response.status}`)
    }

    const data = (await response.json()) as any

    if (!data.results || !Array.isArray(data.results)) {
      return []
    }

    return data.results.map((result: any, index: number) =>
      buildSearchResult({
        id: `exa-${index}`,
        title: result.title || 'Untitled',
        url: result.url || '',
        snippet: result.text || '',
        provider: this.name,
        score: result.score || 0.7,
        publishedAt: parsePublicationDate(result.publishedDate),
        metadata: {
          author: result.author,
          autoprompted: result.autoprompted,
        },
      }),
    )
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    try {
      const startTime = performance.now()

      const response = await fetch(EXA_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          query: 'health',
          numResults: 1,
        }),
      })

      const durationMs = performance.now() - startTime

      if (response.ok) {
        this.lastHealthCheck = new Date()
        this.healthStatus = true
        return {
          healthy: true,
          message: 'Exa provider is operational',
          authenticated: true,
        }
      }

      if (response.status === 401) {
        this.healthStatus = false
        return {
          healthy: false,
          message: 'Exa authentication failed',
          authenticated: false,
        }
      }

      this.healthStatus = false
      return {
        healthy: false,
        message: `Exa API error: ${response.status}`,
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
      maxResultsPerRequest: 30,
      supportedLanguages: ['en'],
      supportedRegions: ['US'],
      supportsDateFilter: true,
      supportsLanguageFilter: true,
      supportsRegionFilter: false,
      averageLatencyMs: 800,
      reliability: 0.98,
      requiresAuthentication: true,
      rateLimit: 50,
    }
  }

  protected isAuthenticated(): boolean {
    return Boolean(this.apiKey) && this.healthStatus
  }
}
