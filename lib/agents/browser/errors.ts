/**
 * Browser Agent Errors
 */

import type { BrowserError } from './types'

/**
 * Fetch error
 */
export class FetchError extends Error implements BrowserError {
  readonly code = 'FETCH_ERROR'
  readonly retryable = true

  constructor(message: string) {
    super(message)
    this.name = 'FetchError'
  }
}

/**
 * HTTP error
 */
export class HttpError extends Error implements BrowserError {
  readonly code: string
  readonly retryable: boolean

  constructor(statusCode: number, message?: string) {
    super(message || `HTTP ${statusCode}`)
    this.name = 'HttpError'
    this.code = `HTTP_${statusCode}`
    // 5xx errors are retryable, 4xx generally are not
    this.retryable = statusCode >= 500 || statusCode === 429
  }
}

/**
 * Content extraction error
 */
export class ExtractionError extends Error implements BrowserError {
  readonly code = 'EXTRACTION_ERROR'
  readonly retryable = false

  constructor(message: string) {
    super(message)
    this.name = 'ExtractionError'
  }
}

/**
 * Content too large error
 */
export class ContentTooLargeError extends Error implements BrowserError {
  readonly code = 'CONTENT_TOO_LARGE'
  readonly retryable = false

  constructor(sizeBytes: number) {
    super(`Content too large: ${sizeBytes} bytes`)
    this.name = 'ContentTooLargeError'
  }
}

/**
 * Unsupported content type error
 */
export class UnsupportedContentError extends Error implements BrowserError {
  readonly code = 'UNSUPPORTED_CONTENT'
  readonly retryable = false

  constructor(contentType: string) {
    super(`Unsupported content type: ${contentType}`)
    this.name = 'UnsupportedContentError'
  }
}

/**
 * Browser timeout error
 */
export class BrowserTimeoutError extends Error implements BrowserError {
  readonly code = 'BROWSER_TIMEOUT'
  readonly retryable = true

  constructor(timeoutMs: number) {
    super(`Browser operation timed out after ${timeoutMs}ms`)
    this.name = 'BrowserTimeoutError'
  }
}

/**
 * Browser provider unavailable error
 */
export class BrowserProviderUnavailableError extends Error implements BrowserError {
  readonly code = 'PROVIDER_UNAVAILABLE'
  readonly retryable = true

  constructor(provider: string) {
    super(`Browser provider '${provider}' is unavailable`)
    this.name = 'BrowserProviderUnavailableError'
  }
}

/**
 * Invalid URL error
 */
export class InvalidUrlError extends Error implements BrowserError {
  readonly code = 'INVALID_URL'
  readonly retryable = false

  constructor(url: string) {
    super(`Invalid URL: ${url}`)
    this.name = 'InvalidUrlError'
  }
}

/**
 * Readability error
 */
export class ReadabilityError extends Error implements BrowserError {
  readonly code = 'READABILITY_ERROR'
  readonly retryable = false

  constructor(message: string) {
    super(message)
    this.name = 'ReadabilityError'
  }
}
