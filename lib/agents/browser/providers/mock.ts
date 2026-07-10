/**
 * Mock Browser Provider
 * 
 * Deterministic mock provider for testing.
 */

import type { BrowserRequest, PageContent, BrowserCapabilities } from '../types'
import { BrowserProvider, type BrowserHealthStatus } from '../provider'
import { generateBrowserId } from '../utils'

/**
 * Mock browser provider
 */
export class MockBrowserProvider extends BrowserProvider {
  readonly name = 'mock'
  readonly version = '1.0.0'
  readonly description = 'Mock browser provider for testing'

  private healthy = true
  private failureMode = false
  private mockContent = 'Mock page content for testing'

  /**
   * Set failure mode
   */
  setFailureMode(enabled: boolean): void {
    this.failureMode = enabled
  }

  /**
   * Set mock content
   */
  setMockContent(content: string): void {
    this.mockContent = content
  }

  /**
   * Set health status
   */
  setHealthy(healthy: boolean): void {
    this.healthy = healthy
  }

  async fetch(request: BrowserRequest): Promise<PageContent> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50))

    if (this.failureMode) {
      throw new Error('Mock browser failure')
    }

    return {
      title: 'Mock Page Title',
      content: this.mockContent,
      metadata: {
        originalUrl: request.url,
        canonicalUrl: request.url,
        title: 'Mock Page Title',
        description: 'Mock page description',
        author: 'Mock Author',
        publisher: 'Mock Publisher',
      },
      language: 'en',
      readingTimeMinutes: 5,
    }
  }

  async healthCheck(): Promise<BrowserHealthStatus> {
    return {
      healthy: this.healthy,
      message: this.healthy ? 'Mock browser is healthy' : 'Mock browser is unhealthy',
      authenticated: true,
    }
  }

  getCapabilities(): BrowserCapabilities {
    return {
      maxPageSizeBytes: 100 * 1024 * 1024,
      supportedContentTypes: ['text/html'],
      supportsJavaScript: false,
      supportsCSS: false,
      returnsMarkdown: true,
      averageLatencyMs: 50,
      reliability: 1.0,
      requiresAuthentication: false,
    }
  }
}
