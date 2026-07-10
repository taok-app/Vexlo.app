/**
 * Browser Provider Interface
 * 
 * Every browser provider must implement this contract.
 * This is the only mechanism for adding new browser providers.
 */

import type {
  BrowserRequest,
  PageContent,
  BrowserCapabilities,
  BrowserMetadata,
} from './types'

/**
 * Browser health status
 */
export interface BrowserHealthStatus {
  /** Overall health */
  healthy: boolean
  /** Status message */
  message: string
  /** Authentication status */
  authenticated: boolean
  /** Additional details */
  details?: Record<string, unknown>
}

/**
 * Abstract base class for all browser providers
 */
export abstract class BrowserProvider {
  /** Provider name */
  abstract readonly name: string

  /** Provider version */
  abstract readonly version: string

  /** Provider description */
  abstract readonly description: string

  /**
   * Fetch and extract page content
   */
  abstract fetch(request: BrowserRequest): Promise<PageContent>

  /**
   * Check provider health
   */
  abstract healthCheck(): Promise<BrowserHealthStatus>

  /**
   * Get provider capabilities
   */
  abstract getCapabilities(): BrowserCapabilities

  /**
   * Optional: Initialize provider
   */
  async initialize?(): Promise<void>

  /**
   * Optional: Warm up provider
   */
  async warmup?(): Promise<void>

  /**
   * Optional: Shutdown provider
   */
  async shutdown?(): Promise<void>

  /**
   * Get provider metadata
   */
  getMetadata(): BrowserMetadata {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      authenticated: this.isAuthenticated(),
      healthy: false, // Will be updated by health check
      capabilities: this.getCapabilities(),
    }
  }

  /**
   * Check if provider is authenticated
   */
  protected isAuthenticated(): boolean {
    return true
  }
}
