import type {
  BrowserCapabilities,
  BrowserMetadata,
  BrowserRequest,
  RawBrowserDocument,
} from './types'

export interface BrowserHealthStatus {
  healthy: boolean
  message: string
  authenticated: boolean
  status: 'available' | 'unavailable'
  configurationValid: boolean
  fetchCapable: boolean
  latencyMs: number
  version: string
  available: boolean
  details?: Record<string, unknown>
}

export abstract class BrowserProvider {
  abstract readonly name: string
  abstract readonly version: string
  abstract readonly description: string

  abstract fetch(request: BrowserRequest): Promise<RawBrowserDocument>
  abstract healthCheck(): Promise<BrowserHealthStatus>
  abstract getCapabilities(): BrowserCapabilities

  async initialize?(): Promise<void>
  async warmup?(): Promise<void>
  async shutdown?(): Promise<void>

  getMetadata(): BrowserMetadata {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      authenticated: this.isAuthenticated(),
      healthy: false,
      capabilities: this.getCapabilities(),
    }
  }

  protected isAuthenticated(): boolean {
    return true
  }
}
