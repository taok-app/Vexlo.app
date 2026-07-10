/**
 * Provider Factory
 * 
 * Responsible for constructing and configuring search provider instances.
 * Supports dependency injection and configuration management.
 */

import type { SearchProvider } from './provider'
import {
  InvalidProviderConfigError,
  ProviderNotFoundError,
} from './errors'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:factory')

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider ID */
  id: string
  /** Whether provider is enabled */
  enabled?: boolean
  /** Provider priority (0-100, higher is better) */
  priority?: number
  /** Request timeout in milliseconds */
  timeoutMs?: number
  /** Max results per request */
  maxResults?: number
  /** API credentials */
  credentials?: Record<string, string>
  /** Additional configuration */
  config?: Record<string, unknown>
}

/**
 * Provider constructor function type
 */
export type ProviderConstructor = (
  config: ProviderConfig,
) => SearchProvider | Promise<SearchProvider>

/**
 * Provider factory
 */
export class ProviderFactory {
  private constructors: Map<string, ProviderConstructor> = new Map()
  private instances: Map<string, SearchProvider> = new Map()
  private configs: Map<string, ProviderConfig> = new Map()

  /**
   * Register a provider constructor
   */
  register(
    providerId: string,
    constructor: ProviderConstructor,
  ): void {
    if (this.constructors.has(providerId)) {
      logger.warn('Provider constructor already registered', {
        provider: providerId,
      })
      return
    }

    this.constructors.set(providerId, constructor)

    logger.debug('Provider constructor registered', {
      provider: providerId,
    })
  }

  /**
   * Create a provider instance
   */
  async create(
    providerId: string,
    config?: ProviderConfig,
  ): Promise<SearchProvider> {
    // Check if instance is cached
    const cached = this.instances.get(providerId)
    if (cached) {
      return cached
    }

    // Get constructor
    const constructor = this.constructors.get(providerId)
    if (!constructor) {
      throw new ProviderNotFoundError(providerId)
    }

    // Prepare configuration
    const finalConfig: ProviderConfig = {
      id: providerId,
      ...this.configs.get(providerId),
      ...config,
    }

    // Validate configuration
    this.validateConfig(finalConfig)

    // Create instance
    try {
      const instance = await constructor(finalConfig)

      logger.debug('Provider instance created', {
        provider: providerId,
      })

      // Cache instance
      this.instances.set(providerId, instance)

      return instance
    } catch (error) {
      logger.error('Failed to create provider instance', {
        provider: providerId,
        error,
      })
      throw error
    }
  }

  /**
   * Create multiple provider instances
   */
  async createMany(
    providerIds: string[],
    config?: ProviderConfig,
  ): Promise<SearchProvider[]> {
    const instances = await Promise.all(
      providerIds.map((id) => this.create(id, config)),
    )

    return instances
  }

  /**
   * Set provider configuration
   */
  setConfig(providerId: string, config: ProviderConfig): void {
    this.validateConfig(config)
    this.configs.set(providerId, config)

    logger.debug('Provider configuration set', {
      provider: providerId,
    })
  }

  /**
   * Get provider configuration
   */
  getConfig(providerId: string): ProviderConfig | undefined {
    return this.configs.get(providerId)
  }

  /**
   * Validate provider configuration
   */
  private validateConfig(config: ProviderConfig): void {
    if (!config.id) {
      throw new InvalidProviderConfigError('Provider ID is required')
    }

    if (config.priority !== undefined) {
      if (config.priority < 0 || config.priority > 100) {
        throw new InvalidProviderConfigError(
          'Provider priority must be between 0 and 100',
        )
      }
    }

    if (config.timeoutMs !== undefined) {
      if (config.timeoutMs < 1000) {
        throw new InvalidProviderConfigError(
          'Provider timeout must be at least 1000ms',
        )
      }
    }

    if (config.maxResults !== undefined) {
      if (config.maxResults < 1 || config.maxResults > 100) {
        throw new InvalidProviderConfigError(
          'Provider maxResults must be between 1 and 100',
        )
      }
    }
  }

  /**
   * Clear cached instances
   */
  clearCache(): void {
    this.instances.clear()
    logger.debug('Provider instance cache cleared')
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.constructors.clear()
    this.instances.clear()
    this.configs.clear()
  }
}

/**
 * Global provider factory instance
 */
let globalFactory: ProviderFactory | null = null

/**
 * Get the global provider factory
 */
export function getProviderFactory(): ProviderFactory {
  if (!globalFactory) {
    globalFactory = new ProviderFactory()
  }
  return globalFactory
}

/**
 * Reset the global factory (for testing)
 */
export function resetProviderFactory(): void {
  globalFactory = null
}
