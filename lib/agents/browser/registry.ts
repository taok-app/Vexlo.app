/**
 * Browser Registry
 * 
 * Singleton registry for managing all browser providers.
 */

import type { BrowserProvider } from './provider'
import type { BrowserCapabilities, BrowserMetadata } from './types'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:registry')

/**
 * Browser provider registry
 */
export class BrowserRegistry {
  private providers: Map<string, BrowserProvider> = new Map()
  private metadata: Map<string, BrowserMetadata> = new Map()

  /**
   * Register a browser provider
   */
  register(provider: BrowserProvider): void {
    const providerId = provider.name

    if (this.providers.has(providerId)) {
      logger.warn('Browser provider already registered', { provider: providerId })
      return
    }

    this.providers.set(providerId, provider)
    this.metadata.set(providerId, provider.getMetadata())

    logger.info('Browser provider registered', {
      provider: providerId,
      version: provider.version,
    })
  }

  /**
   * Resolve a browser provider
   */
  resolve(providerId: string): BrowserProvider {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`Browser provider '${providerId}' not found`)
    }
    return provider
  }

  /**
   * List all browser providers
   */
  list(): BrowserProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * List all provider IDs
   */
  listIds(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Check if provider exists
   */
  exists(providerId: string): boolean {
    return this.providers.has(providerId)
  }

  /**
   * Get provider count
   */
  get count(): number {
    return this.providers.size
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(providerId: string): BrowserCapabilities {
    const provider = this.resolve(providerId)
    return provider.getCapabilities()
  }

  /**
   * Get provider metadata
   */
  getMetadata(providerId: string): BrowserMetadata {
    const metadata = this.metadata.get(providerId)
    if (!metadata) {
      throw new Error(`Browser provider '${providerId}' metadata not found`)
    }
    return metadata
  }

  /**
   * Health check all providers
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const health = new Map<string, boolean>()

    const checkPromises = Array.from(this.providers.entries()).map(
      async ([providerId, provider]) => {
        try {
          const status = await provider.healthCheck()
          health.set(providerId, status.healthy)
          if (!status.healthy) {
            logger.warn('Browser provider health check failed', {
              provider: providerId,
              message: status.message,
            })
          }
        } catch (error) {
          logger.error('Browser provider health check error', {
            provider: providerId,
            error,
          })
          health.set(providerId, false)
        }
      },
    )

    await Promise.all(checkPromises)
    return health
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear()
    this.metadata.clear()
  }
}

/**
 * Global browser registry instance
 */
let globalRegistry: BrowserRegistry | null = null

/**
 * Get the global browser registry
 */
export function getBrowserRegistry(): BrowserRegistry {
  if (!globalRegistry) {
    globalRegistry = new BrowserRegistry()
  }
  return globalRegistry
}

/**
 * Reset the global registry (for testing)
 */
export function resetBrowserRegistry(): void {
  globalRegistry = null
}
