import { createLogger } from '@/lib/logging'

const logger = createLogger('[Runtime.Validator]')
import type { PlannerInput } from '@/lib/research/planner/types'
import type { RuntimeCheckpoint, RuntimeDependencies, RuntimeOptions } from './types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePlannerInput(input: PlannerInput): ValidationResult {
  const errors: string[] = []

  if (!input || typeof input !== 'object') {
    errors.push('Input must be a valid PlannerInput object')
  }

  if (!input.query || typeof input.query !== 'string' || input.query.trim().length === 0) {
    errors.push('Input must contain a non-empty query string')
  }

  return { valid: errors.length === 0, errors }
}

export function validateRuntimeOptions(options: RuntimeOptions): ValidationResult {
  const errors: string[] = []

  if (options.maxConcurrentBrowserRequests !== undefined) {
    if (!Number.isInteger(options.maxConcurrentBrowserRequests) || options.maxConcurrentBrowserRequests < 1) {
      errors.push('maxConcurrentBrowserRequests must be a positive integer')
    }
  }

  if (options.planTimeout !== undefined) {
    if (!Number.isInteger(options.planTimeout) || options.planTimeout < 1000) {
      errors.push('planTimeout must be at least 1000ms')
    }
  }

  if (options.searchTimeout !== undefined) {
    if (!Number.isInteger(options.searchTimeout) || options.searchTimeout < 1000) {
      errors.push('searchTimeout must be at least 1000ms')
    }
  }

  if (options.browserTimeout !== undefined) {
    if (!Number.isInteger(options.browserTimeout) || options.browserTimeout < 1000) {
      errors.push('browserTimeout must be at least 1000ms')
    }
  }

  if (options.retryPolicy !== undefined) {
    if (!Number.isInteger(options.retryPolicy.maxAttempts) || options.retryPolicy.maxAttempts < 1) {
      errors.push('retryPolicy.maxAttempts must be a positive integer')
    }
    if (!Number.isInteger(options.retryPolicy.initialDelayMs) || options.retryPolicy.initialDelayMs < 100) {
      errors.push('retryPolicy.initialDelayMs must be at least 100ms')
    }
  }

  return { valid: errors.length === 0, errors }
}

export function validateDependencies(deps: RuntimeDependencies): ValidationResult {
  const errors: string[] = []

  if (!deps.reasoningAdapter) {
    errors.push('reasoningAdapter is required in runtime dependencies')
  } else if (typeof deps.reasoningAdapter.reason !== 'function') {
    errors.push('reasoningAdapter.reason must be a function')
  }

  return { valid: errors.length === 0, errors }
}

export function validateCheckpoint(checkpoint: RuntimeCheckpoint): ValidationResult {
  const errors: string[] = []

  if (!checkpoint.stage) {
    errors.push('Checkpoint must have a valid stage')
  }

  if (!Number.isInteger(checkpoint.timestamp) || checkpoint.timestamp < 0) {
    errors.push('Checkpoint timestamp must be a non-negative integer')
  }

  return { valid: errors.length === 0, errors }
}

export function logValidationErrors(label: string, result: ValidationResult): void {
  if (!result.valid) {
    logger.error(`[Runtime] Validation failed for ${label}`, {
      errors: result.errors.join('; '),
    })
  }
}
