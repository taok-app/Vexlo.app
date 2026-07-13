/**
 * Provider Selector
 * 
 * Determines which providers to use for a given search query.
 * Supports multiple selection strategies without modifying SearchAgent.
 */

import type {
  SearchQuery,
  ProviderSelectionOptions,
} from './types'
import { ProviderSelectionStrategy } from './types'
import type { ProviderCapabilities } from './types'
import { getProviderRegistry } from './registry'
import { ProviderNotFoundError } from './errors'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:selector')

/**
 * Provider selector
 */
export class ProviderSelector {
  private registry = getProviderRegistry()

  /**
   * Select providers for a query
   */
  selectProviders(
    query: SearchQuery,
    options: ProviderSelectionOptions = {
      strategy: ProviderSelectionStrategy.ALL,
    },
  ): string[] {
    switch (options.strategy) {
      case ProviderSelectionStrategy.ALL:
        return this.selectAll()
      case ProviderSelectionStrategy.PRIMARY:
        return this.selectPrimary()
      case ProviderSelectionStrategy.SPECIFIC:
        return this.selectSpecific(options.providers || [])
      case ProviderSelectionStrategy.CAPABILITY_MATCH:
        return this.selectByCapability(options.requiredCapabilities || [])
      case ProviderSelectionStrategy.AUTO:
        return this.selectAuto(query, options)
      default: {
        const exhaustive: never = options.strategy
        throw new Error(`Unknown selection strategy: ${exhaustive}`)
      }
    }
  }

  /**
   * Select all available providers
   */
  private selectAll(): string[] {
    const providers = this.registry.listIds()

    logger.debug('Selected all providers', {
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
      logger.warn('No providers available for primary selection')
      return []
    }

    const selected = [providers[0]]

    logger.debug('Selected primary provider', {
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
      logger.warn('Some requested providers not available', {
        requested: providerIds.length,
        available: selected.length,
        missing,
      })
    }

    return selected
  }

  /**
   * Select providers matching required capabilities
   */
  private selectByCapability(
    requiredCapabilities: (keyof ProviderCapabilities)[],
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
        logger.debug('Error checking provider capabilities', {
          provider: providerId,
          error,
        })
      }
    }

    logger.debug('Selected providers by capability', {
      required: requiredCapabilities,
      selected: selected.length,
    })

    return selected
  }

  /**
   * Automatically select providers based on query
   */
  private selectAuto(
    query: SearchQuery,
    options: ProviderSelectionOptions,
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
 * Global provider selector instance
 */
let globalSelector: ProviderSelector | null = null

/**
 * Get the global provider selector
 */
export function getProviderSelector(): ProviderSelector {
  if (!globalSelector) {
    globalSelector = new ProviderSelector()
  }
  return globalSelector
}

/**
 * Reset the global selector (for testing)
 */
export function resetProviderSelector(): void {
  globalSelector = null
}
