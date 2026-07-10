/**
 * Search Agent Test Mock Provider
 * 
 * Deterministic mock provider for testing and development.
 */

import type {
  SearchRequest,
  SearchResult,
} from './types'
import { SearchProvider, ProviderHealthStatus } from './provider'
import type { ProviderCapabilities } from './types'

/**
 * Mock search provider for testing
 */
export class MockSearchProvider extends SearchProvider {
  readonly name = 'mock'
  readonly version = '1.0.0'
  readonly description = 'Mock search provider for testing'

  private healthy = true
  private resultsToReturn = 5
  private failureMode = false

  /**
   * Set failure mode (for testing error handling)
   */
  setFailureMode(enabled: boolean): void {
    this.failureMode = enabled
  }

  /**
   * Set number of results to return
   */
  setResultsToReturn(count: number): void {
    this.resultsToReturn = Math.max(0, Math.min(100, count))
  }

  /**
   * Set health status
   */
  setHealthy(healthy: boolean): void {
    this.healthy = healthy
  }

  async search(request: SearchRequest): Promise<SearchResult[]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    if (this.failureMode) {
      throw new Error('Mock provider failure')
    }

    // Generate deterministic mock results
    const results: SearchResult[] = []

    for (let i = 0; i < this.resultsToReturn; i++) {
      results.push({
        id: `mock-${i}`,
        title: `Mock Result ${i + 1}: ${request.query.query}`,
        url: `https://mock.example.com/result-${i}`,
        snippet: `This is a mock search result for query: "${request.query.query}". Result number ${i + 1}.`,
        provider: this.name,
        domain: 'mock.example.com',
        providerScore: 0.8 - i * 0.05,
        rankingScore: 0.8 - i * 0.05,
        metadata: {
          contentType: 'article',
          readingTime: 5 + i,
          verified: true,
        },
      })
    }

    return results
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    return {
      healthy: this.healthy,
      message: this.healthy ? 'Mock provider is healthy' : 'Mock provider is unhealthy',
      authenticated: true,
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxResultsPerRequest: 100,
      supportedLanguages: ['en'],
      supportedRegions: ['US'],
      supportsDateFilter: false,
      supportsLanguageFilter: false,
      supportsRegionFilter: false,
      averageLatencyMs: 100,
      reliability: 1.0,
      requiresAuthentication: false,
    }
  }
}
