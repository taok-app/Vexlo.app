/**
 * Browser Selector
 * 
 * Determines which browser providers to use for content extraction.
 */

import type { BrowserCapabilities } from './types'
import { getBrowserRegistry } from './registry'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:selector')

/**
 * Provider selection strategy
 */
export enum BrowserSelectionStrategy {
  /** Use all registered providers */
  ALL = 'all',
  /** Use primary provider only */
  PRIMARY = 'primary',
  /** Use specified providers */
  SPECIFIC = 'specific',
  /** Use providers matching capabilities */
  CAPABILITY_MATCH = 'capability_match',
  /** Automatic selection based on URL */
  AUTO = 'auto',
}

/**
 * Provider selection options
 */
export interface BrowserSelectionOptions {
  /** Selection strategy */
  strategy: BrowserSelectionStrategy
  /** Specific providers to use (if SPECIFIC strategy) */
  providers?: string[]
  /** Required capabilities (if CAPABILITY_MATCH strategy) */
  requiredCapabilities?: (keyof BrowserCapabilities)[]
  /** Provider priority order */
  priority?: string[]
}

/**
 * Browser provider selector
 */
export class BrowserSelector {
  private registry = getBrowserRegistry()

  /**
   * Select browser providers
   */
  selectProviders(
    url: string,
    options: BrowserSelectionOptions = {
      strategy: BrowserSelectionStrategy.AUTO,
    },
  ): string[] {
    switch (options.strategy) {
      case BrowserSelectionStrategy.ALL:
        return this.selectAll()
      case BrowserSelectionStrategy.PRIMARY:
        return this.selectPrimary()
      case BrowserSelectionStrategy.SPECIFIC:
        return this.selectSpecific(options.providers || [])
      case BrowserSelectionStrategy.CAPABILITY_MATCH:
        return this.selectByCapability(options.requiredCapabilities || [])
      case BrowserSelectionStrategy.AUTO:
        return this.selectAuto(url, options)
      default:
        const exhaustive: never = options.strategy
        throw new Error(`Unknown browser selection strategy: ${exhaustive}`)
    }
  }

  /**
   * Select all available providers
   */
  private selectAll(): string[] {
    const providers = this.registry.listIds()

    logger.debug('Selected all browser providers', {
      count: providers.length,
    })

    return providers
  }

  /**
   * Select primary provider only
   */
  private selectPrimary(): string[] {
    const providers = this.registry.listIds()

    if (providers.length === 0) {
      logger.warn('No browser providers available for primary selection')
      return []
    }

    const selected = [providers[0]]

    logger.debug('Selected primary browser provider', {
      provider: selected[0],
    })

    return selected
  }

  /**
   * Select specific providers
   */
  private selectSpecific(providerIds: string[]): string[] {
    const available = this.registry.listIds()
    const selected = providerIds.filter((id) => available.includes(id))

    if (selected.length !== providerIds.length) {
      const missing = providerIds.filter((id) => !selected.includes(id))
      logger.warn('Some requested browser providers not available', {
        requested: providerIds.length,
        available: selected.length,
        missing,
      })
    }

    return selected
  }

  /**
   * Select providers by capability
   */
  private selectByCapability(
    requiredCapabilities: (keyof BrowserCapabilities)[],
  ): string[] {
    if (requiredCapabilities.length === 0) {
      return this.selectAll()
    }

    const selected: string[] = []

    for (const providerId of this.registry.listIds()) {
      try {
        const capabilities = this.registry.getCapabilities(providerId)
        const hasAll = requiredCapabilities.every(
          (cap) => capabilities[cap] !== undefined,
        )

        if (hasAll) {
          selected.push(providerId)
        }
      } catch (error) {
        logger.debug('Error checking browser provider capabilities', {
          provider: providerId,
          error,
        })
      }
    }

    logger.debug('Selected browser providers by capability', {
      required: requiredCapabilities,
      selected: selected.length,
    })

    return selected
  }

  /**
   * Automatically select providers based on URL
   */
  private selectAuto(
    url: string,
    options: BrowserSelectionOptions,
  ): string[] {
    const available = this.registry.listIds()

    if (available.length === 0) {
      return []
    }

    // Apply priority if specified
    if (options.priority && options.priority.length > 0) {
      const prioritized = options.priority.filter((id) =>
        available.includes(id),
      )
      return prioritized.length > 0 ? prioritized : available
    }

    // Default: use all available providers
    return available
  }
}

/**
 * Global browser selector instance
 */
let globalSelector: BrowserSelector | null = null

/**
 * Get the global browser selector
 */
export function getBrowserSelector(): BrowserSelector {
  if (!globalSelector) {
    globalSelector = new BrowserSelector()
  }
  return globalSelector
}

/**
 * Reset the global selector (for testing)
 */
export function resetBrowserSelector(): void {
  globalSelector = null
}
