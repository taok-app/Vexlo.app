/**
 * Provider Registry
 * 
 * Singleton registry for managing all search providers.
 * The registry is the only mechanism for discovering providers at runtime.
 */

import type { SearchProvider, ProviderExecutionResult } from './provider'
import type { ProviderCapabilities, ProviderMetadata } from './types'
import { ProviderNotFoundError, InvalidProviderConfigError } from './errors'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:registry')

/**
 * Provider registry implementation
 */
export class ProviderRegistry {
  private providers: Map<string, SearchProvider> = new Map()
  private metadata: Map<string, ProviderMetadata> = new Map()
  private initialized = false

  /**
   * Register a provider
   */
  register(provider: SearchProvider): void {
    const providerId = provider.name

    if (this.providers.has(providerId)) {
      logger.warn('Provider already registered', { provider: providerId })
      return
    }

    this.providers.set(providerId, provider)
    this.metadata.set(providerId, provider.getMetadata())

    logger.info('Provider registered', {
      provider: providerId,
      version: provider.version,
    })
  }

  /**
   * Unregister a provider
   */
  async unregister(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId)

    if (!provider) {
      throw new ProviderNotFoundError(providerId)
    }

    // Call shutdown if available
    if (provider.shutdown) {
      try {
        await provider.shutdown()
      } catch (error) {
        logger.error('Error shutting down provider', {
          provider: providerId,
          error,
        })
      }
    }

    this.providers.delete(providerId)
    this.metadata.delete(providerId)

    logger.info('Provider unregistered', { provider: providerId })
  }

  /**
   * Resolve a single provider
   */
  resolve(providerId: string): SearchProvider {
    const provider = this.providers.get(providerId)

    if (!provider) {
      throw new ProviderNotFoundError(providerId)
    }

    return provider
  }

  /**
   * Resolve multiple providers
   */
  resolveMany(providerIds: string[]): SearchProvider[] {
    const resolved: SearchProvider[] = []

    for (const id of providerIds) {
      try {
        resolved.push(this.resolve(id))
      } catch (error) {
        logger.warn('Failed to resolve provider', { provider: id, error })
      }
    }

    return resolved
  }

  /**
   * List all registered providers
   */
  list(): SearchProvider[] {
    return Array.from(this.providers.values())
  }

  /**
   * List all provider IDs
   */
  listIds(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * Check if provider is registered
   */
  exists(providerId: string): boolean {
    return this.providers.has(providerId)
  }

  /**
   * Get number of registered providers
   */
  get count(): number {
    return this.providers.size
  }

  /**
   * Initialize all providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    const initPromises: Promise<void>[] = []

    for (const [providerId, provider] of this.providers) {
      if (provider.initialize) {
        initPromises.push(
          provider
            .initialize()
            .catch((error) => {
              logger.error('Provider initialization failed', {
                provider: providerId,
                error,
              })
            }),
        )
      }
    }

    await Promise.all(initPromises)
    this.initialized = true

    logger.info('Provider registry initialized', {
      count: this.providers.size,
    })
  }

  /**
   * Warm up all providers
   */
  async warmup(): Promise<void> {
    const warmupPromises: Promise<void>[] = []

    for (const [providerId, provider] of this.providers) {
      if (provider.warmup) {
        warmupPromises.push(
          provider
            .warmup()
            .catch((error) => {
              logger.error('Provider warmup failed', {
                provider: providerId,
                error,
              })
            }),
        )
      }
    }

    await Promise.all(warmupPromises)

    logger.info('Provider registry warmed up', {
      count: this.providers.size,
    })
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
            logger.warn('Provider health check failed', {
              provider: providerId,
              message: status.message,
            })
          }
        } catch (error) {
          logger.error('Provider health check error', {
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
   * Get capabilities for a provider
   */
  getCapabilities(providerId: string): ProviderCapabilities {
    const provider = this.resolve(providerId)
    return provider.getCapabilities()
  }

  /**
   * Get metadata for a provider
   */
  getMetadata(providerId: string): ProviderMetadata {
    const metadata = this.metadata.get(providerId)

    if (!metadata) {
      throw new ProviderNotFoundError(providerId)
    }

    return metadata
  }

  /**
   * Get metadata for all providers
   */
  getAllMetadata(): ProviderMetadata[] {
    return Array.from(this.metadata.values())
  }

  /**
   * Shutdown all providers
   */
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = []

    for (const [providerId, provider] of this.providers) {
      if (provider.shutdown) {
        shutdownPromises.push(
          provider
            .shutdown()
            .catch((error) => {
              logger.error('Provider shutdown failed', {
                provider: providerId,
                error,
              })
            }),
        )
      }
    }

    await Promise.all(shutdownPromises)
    this.providers.clear()
    this.metadata.clear()
    this.initialized = false

    logger.info('Provider registry shut down')
  }

  /**
   * Clear all providers (for testing)
   */
  clear(): void {
    this.providers.clear()
    this.metadata.clear()
    this.initialized = false
  }
}

/**
 * Global provider registry instance
 */
let globalRegistry: ProviderRegistry | null = null

/**
 * Get the global provider registry
 */
export function getProviderRegistry(): ProviderRegistry {
  if (!globalRegistry) {
    globalRegistry = new ProviderRegistry()
  }
  return globalRegistry
}

/**
 * Reset the global registry (for testing)
 */
export function resetProviderRegistry(): void {
  globalRegistry = null
}
