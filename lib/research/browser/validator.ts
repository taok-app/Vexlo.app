import { MAX_PAGE_SIZE_BYTES, SUPPORTED_CONTENT_TYPES } from '@/lib/agents/browser/constants'
import type { RawBrowserDocument, RetrievedSource, SearchTask, BrowserValidationResult } from './types'

export function validateUrl(value: string): BrowserValidationResult {
  const errors: BrowserValidationResult['errors'] = []
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.push({ code: 'UNSUPPORTED_PROTOCOL', message: 'Only HTTP and HTTPS URLs are supported', field: 'url' })
    }
    if (!url.hostname) errors.push({ code: 'MISSING_HOST', message: 'URL host is required', field: 'url' })
  } catch {
    errors.push({ code: 'MALFORMED_URL', message: 'URL is malformed', field: 'url' })
  }
  return { valid: errors.length === 0, errors, warnings: [] }
}

export function validateSearchTask(task: SearchTask): BrowserValidationResult {
  const errors: BrowserValidationResult['errors'] = []
  if (!task.id.trim()) errors.push({ code: 'MISSING_TASK_ID', message: 'Search task ID is required', field: 'id' })
  if (!task.query.trim())
    errors.push({ code: 'MISSING_QUERY', message: 'Search task query is required', field: 'query' })
  return { valid: errors.length === 0, errors, warnings: [] }
}

export function validateRawDocument(
  document: RawBrowserDocument,
  maximumBytes = MAX_PAGE_SIZE_BYTES,
): BrowserValidationResult {
  const errors: BrowserValidationResult['errors'] = []
  if (document.responseSize > maximumBytes) {
    errors.push({
      code: 'OVERSIZED_RESPONSE',
      message: `Response exceeds ${maximumBytes} bytes`,
      field: 'responseSize',
    })
  }
  if (!SUPPORTED_CONTENT_TYPES.includes(document.contentType as (typeof SUPPORTED_CONTENT_TYPES)[number])) {
    errors.push({
      code: 'UNSUPPORTED_CONTENT',
      message: `Unsupported content type: ${document.contentType}`,
      field: 'contentType',
    })
  }
  if (!document.html.trim()) errors.push({ code: 'EMPTY_RESPONSE', message: 'Response body is empty', field: 'html' })
  return { valid: errors.length === 0, errors, warnings: [] }
}

export function validateRetrievedSource(source: RetrievedSource): BrowserValidationResult {
  const url = validateUrl(source.url)
  const errors = [...url.errors]
  const warnings: BrowserValidationResult['warnings'] = []
  if (!source.title.trim()) warnings.push({ code: 'MISSING_TITLE', message: 'Source title is missing', field: 'title' })
  if (source.content.trim().length < 100) {
    errors.push({ code: 'INSUFFICIENT_CONTENT', message: 'Source content is too short', field: 'content' })
  }
  for (const [field, score] of Object.entries(source.quality)) {
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      errors.push({ code: 'INVALID_QUALITY_SCORE', message: `${field} must be between 0 and 1`, field })
    }
  }
  return { valid: errors.length === 0, errors, warnings }
}
