import type { Middleware, MiddlewareValidationResult, RuntimeContext } from './types'

export function validateMiddleware(middleware: Middleware): MiddlewareValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate ID
  if (!middleware.id || middleware.id.trim() === '') {
    errors.push('Middleware must have a non-empty id')
  }

  // Validate name
  if (!middleware.name || middleware.name.trim() === '') {
    errors.push('Middleware must have a non-empty name')
  }

  // Validate execute function
  if (typeof middleware.execute !== 'function') {
    errors.push('Middleware must have an execute function')
  }

  // Validate hooks if present
  if (middleware.hooks) {
    if (middleware.hooks.before && typeof middleware.hooks.before !== 'function') {
      errors.push('Middleware.hooks.before must be a function')
    }
    if (middleware.hooks.after && typeof middleware.hooks.after !== 'function') {
      errors.push('Middleware.hooks.after must be a function')
    }
    if (middleware.hooks.onError && typeof middleware.hooks.onError !== 'function') {
      errors.push('Middleware.hooks.onError must be a function')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function validateMiddlewareList(middlewares: Middleware[]): MiddlewareValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const ids = new Set<string>()

  for (const middleware of middlewares) {
    const result = validateMiddleware(middleware)
    errors.push(...result.errors)
    warnings.push(...result.warnings)

    // Check for duplicate IDs
    if (ids.has(middleware.id)) {
      errors.push(`Duplicate middleware id: '${middleware.id}'`)
    }
    ids.add(middleware.id)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function validateContextMutation(
  context: RuntimeContext,
  mutations: Partial<RuntimeContext>,
): MiddlewareValidationResult {
  const errors: string[] = []

  // Only metadata should be mutable
  const allowedMutations = ['metadata']
  for (const key of Object.keys(mutations)) {
    if (!allowedMutations.includes(key)) {
      errors.push(`Cannot mutate context field '${key}' - only metadata is mutable`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  }
}
