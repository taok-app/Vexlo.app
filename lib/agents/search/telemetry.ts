/**
 * Search Agent Telemetry
 * 
 * Emits structured events for monitoring and observability.
 */

import type { SearchTelemetryEvent } from './types'
import { createLogger } from '@/lib/logging'

const logger = createLogger('search:telemetry')

/**
 * Telemetry event emitter
 */
export class SearchTelemetry {
  private listeners: Set<(event: SearchTelemetryEvent) => void> = new Set()

  /**
   * Subscribe to telemetry events
   */
  on(listener: (event: SearchTelemetryEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Emit a telemetry event
   */
  emit(event: SearchTelemetryEvent): void {
    logger.debug('Telemetry event', {
      type: event.type,
      provider: event.provider,
      durationMs: event.durationMs,
    })

    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        logger.error('Error in telemetry listener', { error })
      }
    }
  }

  /**
   * Emit search started event
   */
  searchStarted(executionId: string): void {
    this.emit({
      type: 'search_started',
      timestamp: new Date(),
      metadata: { executionId },
    })
  }

  /**
   * Emit provider success event
   */
  providerSuccess(
    provider: string,
    durationMs: number,
    resultCount: number,
  ): void {
    this.emit({
      type: 'provider_success',
      timestamp: new Date(),
      provider,
      durationMs,
      resultCount,
    })
  }

  /**
   * Emit provider failed event
   */
  providerFailed(
    provider: string,
    durationMs: number,
    error: Error,
  ): void {
    this.emit({
      type: 'provider_failed',
      timestamp: new Date(),
      provider,
      durationMs,
      error: {
        code: error.name,
        message: error.message,
      },
    })
  }

  /**
   * Emit search completed event
   */
  searchCompleted(
    executionId: string,
    totalDurationMs: number,
    resultCount: number,
  ): void {
    this.emit({
      type: 'search_completed',
      timestamp: new Date(),
      durationMs: totalDurationMs,
      resultCount,
      metadata: { executionId },
    })
  }

  /**
   * Emit search error event
   */
  searchError(
    executionId: string,
    error: Error,
  ): void {
    this.emit({
      type: 'search_error',
      timestamp: new Date(),
      error: {
        code: error.name,
        message: error.message,
      },
      metadata: { executionId },
    })
  }
}

/**
 * Global telemetry instance
 */
export const searchTelemetry = new SearchTelemetry()
