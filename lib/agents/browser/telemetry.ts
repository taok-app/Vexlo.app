/**
 * Browser Telemetry
 * 
 * Emits structured events for browser operations monitoring.
 */

import type { BrowserTelemetryEvent } from './types'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:telemetry')

/**
 * Browser telemetry event emitter
 */
export class BrowserTelemetry {
  private listeners: Set<(event: BrowserTelemetryEvent) => void> = new Set()

  /**
   * Subscribe to telemetry events
   */
  on(listener: (event: BrowserTelemetryEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Emit a telemetry event
   */
  emit(event: BrowserTelemetryEvent): void {
    logger.debug('Browser telemetry event', {
      type: event.type,
      provider: event.provider,
      durationMs: event.durationMs,
    })

    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        logger.error('Error in browser telemetry listener', { error })
      }
    }
  }

  /**
   * Emit fetch started event
   */
  fetchStarted(provider: string, url: string): void {
    this.emit({
      type: 'fetch_started',
      timestamp: new Date(),
      provider,
      metadata: { url },
    })
  }

  /**
   * Emit fetch completed event
   */
  fetchCompleted(
    provider: string,
    durationMs: number,
    contentSize: number,
  ): void {
    this.emit({
      type: 'fetch_completed',
      timestamp: new Date(),
      provider,
      durationMs,
      contentSize,
    })
  }

  /**
   * Emit extraction completed event
   */
  extractionCompleted(
    durationMs: number,
    contentSize: number,
  ): void {
    this.emit({
      type: 'extraction_completed',
      timestamp: new Date(),
      durationMs,
      contentSize,
    })
  }

  /**
   * Emit browser error event
   */
  browserError(
    error: Error,
    provider?: string,
  ): void {
    this.emit({
      type: 'browser_error',
      timestamp: new Date(),
      provider,
      error: {
        code: error.name,
        message: error.message,
      },
    })
  }
}

/**
 * Global browser telemetry instance
 */
export const browserTelemetry = new BrowserTelemetry()
