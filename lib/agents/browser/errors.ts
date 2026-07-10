import { BrowserError } from './types'

export class FetchError extends BrowserError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'FETCH_ERROR', true, options)
    this.name = 'FetchError'
  }
}

export class TimeoutError extends BrowserError {
  constructor(timeoutMs: number, options?: ErrorOptions) {
    super(`Browser request timed out after ${timeoutMs}ms`, 'TIMEOUT', true, options)
    this.name = 'TimeoutError'
  }
}

export class ValidationError extends BrowserError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'VALIDATION_ERROR', false, options)
    this.name = 'ValidationError'
  }
}

export class NetworkError extends BrowserError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 'NETWORK_ERROR', true, options)
    this.name = 'NetworkError'
  }
}

export class ProviderUnavailableError extends BrowserError {
  constructor(provider: string, options?: ErrorOptions) {
    super(`Browser provider '${provider}' is unavailable`, 'PROVIDER_UNAVAILABLE', true, options)
    this.name = 'ProviderUnavailableError'
  }
}

export class UnsupportedContentError extends BrowserError {
  constructor(contentType: string, options?: ErrorOptions) {
    super(`Unsupported content type: ${contentType || 'unknown'}`, 'UNSUPPORTED_CONTENT', false, options)
    this.name = 'UnsupportedContentError'
  }
}

export class HttpError extends BrowserError {
  readonly statusCode: number

  constructor(statusCode: number, message?: string, options?: ErrorOptions) {
    super(message ?? `HTTP ${statusCode}`, `HTTP_${statusCode}`, statusCode === 408 || statusCode === 429 || statusCode >= 500, options)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

export class ContentTooLargeError extends ValidationError {
  constructor(sizeBytes: number, maximumBytes?: number) {
    super(
      maximumBytes === undefined
        ? `Content too large: ${sizeBytes} bytes`
        : `Content too large: ${sizeBytes} bytes exceeds ${maximumBytes} bytes`,
    )
    this.name = 'ContentTooLargeError'
  }
}

export class ExtractionError extends BrowserError {
  constructor(message: string) {
    super(message, 'EXTRACTION_ERROR')
    this.name = 'ExtractionError'
  }
}

export class ReadabilityError extends BrowserError {
  constructor(message: string) {
    super(message, 'READABILITY_ERROR')
    this.name = 'ReadabilityError'
  }
}

export { TimeoutError as BrowserTimeoutError }
export { ProviderUnavailableError as BrowserProviderUnavailableError }
export { ValidationError as InvalidUrlError }
