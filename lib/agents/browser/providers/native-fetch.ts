import 'server-only'

import { BaseBrowserProvider } from './base-provider'
import type { BrowserHealthStatus } from '../provider'
import type { BrowserCapabilities, BrowserRequest, RawBrowserDocument } from '../types'
import {
  type BrowserProviderConfig,
  resolveBrowserProviderConfig,
  validateBrowserProviderConfig,
} from '../factory'
import {
  BrowserError,
} from '../types'
import {
  ContentTooLargeError,
  FetchError,
  HttpError,
  NetworkError,
  ProviderUnavailableError,
  TimeoutError,
  UnsupportedContentError,
  ValidationError,
} from '../errors'
import { browserTelemetry } from '../telemetry'

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
])

interface AttemptResult {
  response: Response
  finalUrl: string
  redirectCount: number
}

export class NativeFetchProvider extends BaseBrowserProvider {
  readonly name = 'native-fetch'
  readonly version = '1.0.0'
  readonly description = 'Server-only native HTTP(S) raw page retrieval provider'

  constructor(config: BrowserProviderConfig = { id: 'native-fetch' }) {
    super(resolveBrowserProviderConfig({ ...config, id: 'native-fetch' }))
  }

  async fetch(request: BrowserRequest): Promise<RawBrowserDocument> {
    const requestUrl = this.validateRequest(request).href
    const startedAt = performance.now()
    const timeoutMs = request.timeoutMs ?? this.config.timeoutMs
    let retryCount = 0
    let redirectCount = 0

    browserTelemetry.fetchStarted(this.name, requestUrl)

    try {
      for (let attempt = 0; attempt <= this.config.retries; attempt++) {
        try {
          const result = await this.executeTimedAttempt(requestUrl, timeoutMs, request.signal, startedAt)
          redirectCount = result.redirectCount
          const document = result.document
          retryCount = attempt
          this.recordSuccess()
          browserTelemetry.fetchCompleted(this.name, {
            durationMs: document.duration,
            responseSize: document.responseSize,
            statusCode: document.statusCode,
            redirectCount,
            retryCount,
          })
          return document
        } catch (cause) {
          const error = this.translateError(cause, timeoutMs, request.signal)
          if (error instanceof TimeoutError) browserTelemetry.fetchTimeout(this.name, timeoutMs)
          if (request.signal?.aborted || !error.retryable || attempt === this.config.retries) throw error
          retryCount = attempt + 1
          browserTelemetry.fetchRetried(this.name, retryCount, error)
          await this.delay(this.config.retryDelayMs * 2 ** attempt, request.signal)
        }
      }
      throw new FetchError('Native fetch exhausted all retry attempts')
    } catch (cause) {
      const error = this.translateError(cause, timeoutMs, request.signal)
      this.recordFailure()
      browserTelemetry.browserError(error, this.name)
      throw error
    }
  }

  getCapabilities(): BrowserCapabilities {
    return {
      maxPageSizeBytes: this.config.maxPageSizeBytes,
      supportedContentTypes: [...this.config.supportedContentTypes],
      supportsJavaScript: false,
      supportsCSS: false,
      returnsMarkdown: false,
      averageLatencyMs: 0,
      reliability: 1,
      requiresAuthentication: false,
    }
  }

  protected async checkHealth(): Promise<BrowserHealthStatus> {
    validateBrowserProviderConfig(this.config)
    const fetchCapable = typeof globalThis.fetch === 'function'
    return {
      healthy: this.config.enabled && fetchCapable,
      message: this.config.enabled && fetchCapable ? 'Native fetch is available' : 'Native fetch is unavailable',
      authenticated: true,
      status: this.config.enabled && fetchCapable ? 'available' : 'unavailable',
      configurationValid: true,
      fetchCapable,
      latencyMs: 0,
      version: this.version,
      available: this.config.enabled && fetchCapable,
      details: { runtime: 'server', networkProbePerformed: false },
    }
  }

  private async executeTimedAttempt(
    url: string,
    timeoutMs: number,
    callerSignal: AbortSignal | undefined,
    startedAt: number,
  ): Promise<{ document: RawBrowserDocument; redirectCount: number }> {
    const controller = new AbortController()
    let timedOut = false
    const abortFromCaller = () => controller.abort(callerSignal?.reason)
    if (callerSignal?.aborted) abortFromCaller()
    else callerSignal?.addEventListener('abort', abortFromCaller, { once: true })
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort(new TimeoutError(timeoutMs))
    }, timeoutMs)

    try {
      const result = await this.followRedirects(url, controller.signal)
      const document = await this.createDocument(url, result, startedAt)
      return { document, redirectCount: result.redirectCount }
    } catch (cause) {
      if (timedOut) throw new TimeoutError(timeoutMs, { cause })
      throw cause
    } finally {
      clearTimeout(timeout)
      callerSignal?.removeEventListener('abort', abortFromCaller)
    }
  }

  private async followRedirects(url: string, signal: AbortSignal): Promise<AttemptResult> {
    let currentUrl = url
    let redirectCount = 0
    while (true) {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: this.buildHeaders(),
        redirect: 'manual',
        signal,
      })
      if (!REDIRECT_STATUSES.has(response.status)) return { response, finalUrl: currentUrl, redirectCount }

      const location = response.headers.get('location')
      if (!location) throw new FetchError(`Redirect response ${response.status} did not include a Location header`)
      if (redirectCount >= this.config.maxRedirects) {
        throw new ValidationError(`Maximum redirect count of ${this.config.maxRedirects} exceeded`)
      }
      const nextUrl = new URL(location, currentUrl)
      if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
        throw new ValidationError(`Unsupported redirect protocol: ${nextUrl.protocol}`)
      }
      redirectCount++
      currentUrl = nextUrl.href
      browserTelemetry.fetchRedirected(this.name, response.status, redirectCount, currentUrl)
      await response.body?.cancel()
    }
  }

  private async createDocument(
    requestUrl: string,
    result: AttemptResult,
    startedAt: number,
  ): Promise<RawBrowserDocument> {
    const { response } = result
    if (!response.ok) {
      await response.body?.cancel()
      throw new HttpError(response.status, `HTTP ${response.status} ${response.statusText}`.trim())
    }

    const rawContentType = response.headers.get('content-type') ?? ''
    const { mediaType, declaredCharset } = this.parseContentType(rawContentType)
    if (!this.config.supportedContentTypes.includes(mediaType)) {
      await response.body?.cancel()
      throw new UnsupportedContentError(mediaType)
    }

    const declaredLength = this.parseContentLength(response.headers.get('content-length'))
    if (declaredLength !== undefined && declaredLength > this.config.maxPageSizeBytes) {
      await response.body?.cancel()
      this.validatePageSize(declaredLength)
    }
    const bytes = await this.readBody(response)
    const charset = declaredCharset ?? this.detectBomCharset(bytes) ?? 'utf-8'
    let html: string
    try {
      html = new TextDecoder(charset).decode(bytes)
    } catch (cause) {
      throw new UnsupportedContentError(`${mediaType}; charset=${charset}`, { cause })
    }

    return {
      requestUrl,
      finalUrl: result.finalUrl,
      statusCode: response.status,
      headers: this.normalizeHeaders(response.headers),
      contentType: mediaType,
      charset,
      html,
      responseSize: bytes.byteLength,
      fetchedAt: new Date(),
      provider: this.name,
      duration: Math.round(performance.now() - startedAt),
    }
  }

  private buildHeaders(): Headers {
    const headers = new Headers(this.config.requestHeaders)
    if (!headers.has('user-agent')) headers.set('user-agent', this.config.userAgent)
    if (!headers.has('accept-language')) headers.set('accept-language', this.config.acceptLanguage)
    if (!headers.has('accept')) headers.set('accept', this.config.supportedContentTypes.join(', '))
    if (!headers.has('accept-encoding')) {
      headers.set('accept-encoding', this.config.compression ? 'gzip, br, deflate' : 'identity')
    }
    return headers
  }

  private async readBody(response: Response): Promise<Uint8Array> {
    if (!response.body) return new Uint8Array()
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > this.config.maxPageSizeBytes) {
          await reader.cancel()
          throw new ContentTooLargeError(size, this.config.maxPageSizeBytes)
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return bytes
  }

  private parseContentType(value: string): { mediaType: string; declaredCharset?: string } {
    const [type = '', ...parameters] = value.split(';')
    const mediaType = type.trim().toLowerCase()
    const charsetParameter = parameters.find((parameter) => parameter.trim().toLowerCase().startsWith('charset='))
    const declaredCharset = charsetParameter?.split('=', 2)[1]?.trim().replace(/^['"]|['"]$/g, '').toLowerCase()
    return { mediaType, declaredCharset: declaredCharset || undefined }
  }

  private detectBomCharset(bytes: Uint8Array): string | undefined {
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return 'utf-8'
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return 'utf-16le'
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return 'utf-16be'
    return undefined
  }

  private parseContentLength(value: string | null): number | undefined {
    if (value === null) return undefined
    const size = Number(value)
    return Number.isSafeInteger(size) && size >= 0 ? size : undefined
  }

  private normalizeHeaders(headers: Headers): Record<string, string> {
    return Object.fromEntries(Array.from(headers.entries(), ([key, value]) => [key.toLowerCase(), value]))
  }

  private translateError(cause: unknown, timeoutMs: number, callerSignal?: AbortSignal): BrowserError {
    if (cause instanceof BrowserError) return cause
    if (callerSignal?.aborted) return new FetchError('Browser request was cancelled', { cause })
    if (cause instanceof DOMException && cause.name === 'AbortError') return new TimeoutError(timeoutMs, { cause })
    if (cause instanceof TypeError) {
      const code = this.getCauseCode(cause)
      const message = code ? `Network request failed (${code})` : `Network request failed: ${cause.message}`
      return new NetworkError(message, { cause })
    }
    if (cause instanceof Error) return new FetchError(cause.message, { cause })
    return new FetchError('Unknown native fetch failure', { cause })
  }

  private getCauseCode(error: Error): string | undefined {
    const cause = error.cause
    if (typeof cause !== 'object' || cause === null || !('code' in cause)) return undefined
    const code = String(cause.code)
    return RETRYABLE_NETWORK_CODES.has(code) ? code : undefined
  }

  private delay(durationMs: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new FetchError('Browser request was cancelled'))
        return
      }
      const timeout = setTimeout(() => {
        signal?.removeEventListener('abort', cancel)
        resolve()
      }, durationMs)
      const cancel = () => {
        clearTimeout(timeout)
        reject(new FetchError('Browser request was cancelled'))
      }
      signal?.addEventListener('abort', cancel, { once: true })
    })
  }
}

export function createNativeFetchProvider(config: BrowserProviderConfig): NativeFetchProvider {
  if (!config.enabled && config.enabled !== undefined) throw new ProviderUnavailableError('native-fetch')
  return new NativeFetchProvider(config)
}
