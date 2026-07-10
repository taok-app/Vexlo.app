import type { BrowserError, BrowserTelemetryEvent } from './types'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:telemetry')
type TelemetryListener = (event: BrowserTelemetryEvent) => void

export class BrowserTelemetry {
  private listeners = new Set<TelemetryListener>()

  on(listener: TelemetryListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event: BrowserTelemetryEvent): void {
    logger.debug('Browser telemetry event', {
      type: event.type,
      provider: event.provider,
      durationMs: event.durationMs,
      statusCode: event.statusCode,
    })
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        logger.error('Error in browser telemetry listener', { error })
      }
    }
  }

  fetchStarted(provider: string, url: string): void {
    this.emit({ type: 'fetch_started', timestamp: new Date(), provider, metadata: { url } })
  }

  fetchCompleted(
    provider: string,
    metrics: {
      durationMs: number
      responseSize: number
      statusCode: number
      redirectCount: number
      retryCount: number
    },
  ): void {
    this.emit({ type: 'fetch_completed', timestamp: new Date(), provider, ...metrics })
  }

  fetchRedirected(provider: string, statusCode: number, redirectCount: number, url: string): void {
    this.emit({
      type: 'fetch_redirected',
      timestamp: new Date(),
      provider,
      statusCode,
      redirectCount,
      metadata: { url },
    })
  }

  fetchRetried(provider: string, retryCount: number, error: Error): void {
    this.emit({
      type: 'fetch_retried',
      timestamp: new Date(),
      provider,
      retryCount,
      error: this.toErrorInfo(error),
    })
  }

  fetchTimeout(provider: string, timeoutMs: number): void {
    this.emit({
      type: 'fetch_timeout',
      timestamp: new Date(),
      provider,
      timeoutCount: 1,
      metadata: { timeoutMs },
    })
  }

  browserError(error: Error, provider?: string): void {
    this.emit({
      type: 'browser_error',
      timestamp: new Date(),
      provider,
      failureCount: 1,
      error: this.toErrorInfo(error),
    })
  }

  private toErrorInfo(error: Error) {
    const browserError = error as Partial<BrowserError>
    return {
      code: browserError.code ?? error.name,
      message: error.message,
      timestamp: new Date(),
      retryable: browserError.retryable ?? false,
    }
  }
}

export const browserTelemetry = new BrowserTelemetry()
