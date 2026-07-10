import type { BrowserCapabilities, BrowserRequest, RawBrowserDocument } from '../types'
import { BrowserProvider, type BrowserHealthStatus } from '../provider'
import { FetchError } from '../errors'

export class MockBrowserProvider extends BrowserProvider {
  readonly name = 'mock'
  readonly version = '1.0.0'
  readonly description = 'Deterministic raw browser provider for testing'

  private healthy = true
  private failureMode = false
  private mockContent = '<!doctype html><html><body>Mock page content for testing</body></html>'

  setFailureMode(enabled: boolean): void {
    this.failureMode = enabled
  }

  setMockContent(content: string): void {
    this.mockContent = content
  }

  setHealthy(healthy: boolean): void {
    this.healthy = healthy
  }

  async fetch(request: BrowserRequest): Promise<RawBrowserDocument> {
    if (this.failureMode) throw new FetchError('Mock browser failure')
    const responseSize = new TextEncoder().encode(this.mockContent).byteLength
    return {
      requestUrl: request.url,
      finalUrl: request.url,
      statusCode: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
      contentType: 'text/html',
      charset: 'utf-8',
      html: this.mockContent,
      responseSize,
      fetchedAt: new Date(),
      provider: this.name,
      duration: 0,
    }
  }

  async healthCheck(): Promise<BrowserHealthStatus> {
    return {
      healthy: this.healthy,
      message: this.healthy ? 'Mock browser is healthy' : 'Mock browser is unhealthy',
      authenticated: true,
      status: this.healthy ? 'available' : 'unavailable',
      configurationValid: true,
      fetchCapable: this.healthy,
      latencyMs: 0,
      version: this.version,
      available: this.healthy,
    }
  }

  getCapabilities(): BrowserCapabilities {
    return {
      maxPageSizeBytes: 100 * 1024 * 1024,
      supportedContentTypes: ['text/html'],
      supportsJavaScript: false,
      supportsCSS: false,
      returnsMarkdown: false,
      averageLatencyMs: 0,
      reliability: 1,
      requiresAuthentication: false,
    }
  }
}
