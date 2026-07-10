/**
 * Browser Factory
 * 
 * Responsible for constructing and configuring browser provider instances.
 * Supports dependency injection and configuration management.
 */

import type { BrowserProvider } from './provider'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:factory')

/**
 * Browser provider configuration
 */
export interface BrowserProviderConfig {
  /** Provider ID */
  id: string
  /** Whether provider is enabled */
  enabled?: boolean
  /** Provider priority (0-100, higher is better) */
  priority?: number
  /** Request timeout in milliseconds */
  timeoutMs?: number
  /** Additional configuration */
  config?: Record<string, unknown>
}

/**
 * Browser provider constructor function type
 */
export type BrowserProviderConstructor = (
  config: BrowserProviderConfig,
) => BrowserProvider | Promise<BrowserProvider>

/**
 * Browser provider factory
 */
export class BrowserFactory {
  private constructors: Map<string, BrowserProviderConstructor> = new Map()
  private instances: Map<string, BrowserProvider> = new Map()
  private configs: Map<string, BrowserProviderConfig> = new Map()

  /**
   * Register a browser provider constructor
   */
  register(
    providerId: string,
    constructor: BrowserProviderConstructor,
  ): void {
    if (this.constructors.has(providerId)) {
      logger.warn('Browser provider constructor already registered', {
        provider: providerId,
      })
      return
    }

    this.constructors.set(providerId, constructor)

    logger.debug('Browser provider constructor registered', {
      provider: providerId,
    })
  }

  /**
   * Create a browser provider instance
   */
  async create(
    providerId: string,
    config?: BrowserProviderConfig,
  ): Promise<BrowserProvider> {
    // Check if instance is cached
    const cached = this.instances.get(providerId)
    if (cached) {
      return cached
    }

    // Get constructor
    const constructor = this.constructors.get(providerId)
    if (!constructor) {
      throw new Error(`Browser provider '${providerId}' not found`)
    }

    // Prepare configuration
    const finalConfig: BrowserProviderConfig = {
      id: providerId,
      ...this.configs.get(providerId),
      ...config,
    }

    // Validate configuration
    this.validateConfig(finalConfig)

    // Create instance
    try {
      const instance = await constructor(finalConfig)

      logger.debug('Browser provider instance created', {
        provider: providerId,
      })

      // Cache instance
      this.instances.set(providerId, instance)

      return instance
    } catch (error) {
      logger.error('Failed to create browser provider instance', {
        provider: providerId,
        error,
      })
      throw error
    }
  }

  /**
   * Create multiple browser provider instances
   */
  async createMany(
    providerIds: string[],
    config?: BrowserProviderConfig,
  ): Promise<BrowserProvider[]> {
    const instances = await Promise.all(
      providerIds.map((id) => this.create(id, config)),
    )
    return instances
  }

  /**
   * Set browser provider configuration
   */
  setConfig(providerId: string, config: BrowserProviderConfig): void {
    this.validateConfig(config)
    this.configs.set(providerId, config)

    logger.debug('Browser provider configuration set', {
      provider: providerId,
    })
  }

  /**
   * Get browser provider configuration
   */
  getConfig(providerId: string): BrowserProviderConfig | undefined {
    return this.configs.get(providerId)
  }

  /**
   * Validate browser provider configuration
   */
  private validateConfig(config: BrowserProviderConfig): void {
    if (!config.id) {
      throw new Error('Browser provider ID is required')
    }

    if (config.priority !== undefined) {
      if (config.priority < 0 || config.priority > 100) {
        throw new Error('Browser provider priority must be between 0 and 100')
      }
    }

    if (config.timeoutMs !== undefined) {
      if (config.timeoutMs < 1000) {
        throw new Error('Browser provider timeout must be at least 1000ms')
      }
    }
  }

  /**
   * Clear cached instances
   */
  clearCache(): void {
    this.instances.clear()
    logger.debug('Browser provider instance cache cleared')
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
 * Global browser factory instance
 */
let globalFactory: BrowserFactory | null = null

/**
 * Get the global browser factory
 */
export function getBrowserFactory(): BrowserFactory {
  if (!globalFactory) {
    globalFactory = new BrowserFactory()
  }
  return globalFactory
}

/**
 * Reset the global factory (for testing)
 */
export function resetBrowserFactory(): void {
  globalFactory = null
}
