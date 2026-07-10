import type {
  BrowserExecutionContext,
  BrowserRequest,
  BrowserResponse,
  RawBrowserDocument,
} from './types'
import { getBrowserRegistry } from './registry'
import { getBrowserFactory } from './factory'
import { BrowserSelectionStrategy, getBrowserSelector } from './selector'
import { createNativeFetchProvider } from './providers/native-fetch'
import { DEFAULT_BROWSER_TIMEOUT_MS, NATIVE_FETCH_PROVIDER_ID } from './constants'
import { ProviderUnavailableError, ValidationError } from './errors'
import { generateBrowserId, generateBrowserRequestId } from './utils'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:agent')

export class BrowserAgent {
  private readonly registry = getBrowserRegistry()
  private readonly factory = getBrowserFactory()
  private readonly selector = getBrowserSelector()

  async fetch(url: string, context?: Partial<BrowserExecutionContext>): Promise<BrowserResponse> {
    const browserId = generateBrowserId()
    const executionContext = this.buildExecutionContext(browserId, context)
    this.validateUrl(url)
    await this.ensureDefaultProvider()

    const startedAt = performance.now()
    const providerIds = this.selector.selectProviders(url, { strategy: BrowserSelectionStrategy.AUTO })
    if (providerIds.length === 0) throw new ProviderUnavailableError(NATIVE_FETCH_PROVIDER_ID)

    let lastError: Error | undefined
    for (const providerId of providerIds) {
      try {
        const document = await this.executeProvider(providerId, url, executionContext)
        return this.buildResponse(browserId, url, document, Math.round(performance.now() - startedAt))
      } catch (cause) {
        lastError = cause instanceof Error ? cause : new Error(String(cause))
        logger.warn('Browser retrieval provider failed', { provider: providerId, error: lastError.message })
      }
    }
    throw lastError ?? new ProviderUnavailableError(providerIds[0] ?? NATIVE_FETCH_PROVIDER_ID)
  }

  private async ensureDefaultProvider(): Promise<void> {
    if (this.registry.exists(NATIVE_FETCH_PROVIDER_ID)) return
    this.factory.register(NATIVE_FETCH_PROVIDER_ID, createNativeFetchProvider)
    const provider = await this.factory.create(NATIVE_FETCH_PROVIDER_ID)
    this.registry.register(provider)
  }

  private executeProvider(
    providerId: string,
    url: string,
    context: BrowserExecutionContext,
  ): Promise<RawBrowserDocument> {
    const provider = this.registry.resolve(providerId)
    const request: BrowserRequest = {
      requestId: generateBrowserRequestId(),
      url,
      timeoutMs: context.timeoutMs,
      provider: providerId,
      signal: context.signal,
      context: context.context,
    }
    return provider.fetch(request)
  }

  private validateUrl(url: string): void {
    if (!url?.trim()) throw new ValidationError('URL cannot be empty')
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch (cause) {
      throw new ValidationError(`Invalid URL: ${url}`, { cause })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ValidationError(`Unsupported URL protocol: ${parsed.protocol}`)
    }
  }

  private buildExecutionContext(
    browserId: string,
    partial?: Partial<BrowserExecutionContext>,
  ): BrowserExecutionContext {
    return {
      executionId: browserId,
      organizationId: partial?.organizationId,
      userId: partial?.userId,
      timeoutMs: partial?.timeoutMs ?? DEFAULT_BROWSER_TIMEOUT_MS,
      signal: partial?.signal,
      context: partial?.context,
    }
  }

  private buildResponse(
    browserId: string,
    url: string,
    document: RawBrowserDocument,
    totalDurationMs: number,
  ): BrowserResponse {
    return {
      browserId,
      url,
      document,
      statistics: {
        totalDurationMs,
        fetchDurationMs: document.duration,
        contentSizeBytes: document.responseSize,
        statusCode: document.statusCode,
      },
      success: true,
    }
  }
}
