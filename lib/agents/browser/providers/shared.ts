/**
 * Browser Shared Utilities
 * 
 * Common functions used across all browser provider implementations.
 */

/**
 * Check if content type is supported
 */
export function isSupportedContentType(contentType: string): boolean {
  const supported = [
    'text/html',
    'application/xhtml+xml',
    'text/plain',
    'application/xml',
  ]
  return supported.some((type) => contentType.toLowerCase().includes(type))
}

/**
 * Parse content type header
 */
export function parseContentType(
  contentTypeHeader: string,
): { type: string; charset?: string } {
  const parts = contentTypeHeader.split(';')
  const type = parts[0].trim()
  const charset = parts
    .find((p) => p.includes('charset'))
    ?.split('=')
    .pop()
    ?.trim()

  return { type, charset }
}

/**
 * Check if HTTP status is retryable
 */
export function isRetryableHttpStatus(statusCode: number): boolean {
  return (
    statusCode === 408 || // Request Timeout
    statusCode === 429 || // Too Many Requests
    statusCode === 500 || // Internal Server Error
    statusCode === 502 || // Bad Gateway
    statusCode === 503 || // Service Unavailable
    statusCode === 504 // Gateway Timeout
  )
}

/**
 * Sanitize HTML for processing
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags
  let sanitized = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  // Remove style tags
  sanitized = sanitized.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  // Remove comments
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '')
  return sanitized
}

/**
 * Extract text from HTML (simple implementation)
 */
export function extractTextFromHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '')
  // Decode HTML entities
  text = text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim()
  return text
}
