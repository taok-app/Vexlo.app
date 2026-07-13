import { createLogger } from '@/lib/logging'
import type { Middleware, RuntimeContext } from './types'
import type { WorkflowStageConfig } from '@/lib/research/workflow/types'
import { recordMetric, recordFailure } from './context'

const logger = createLogger('[Middleware.Builtins]')

export const LoggingMiddleware: Middleware = {
  id: 'logging',
  name: 'Logging Middleware',
  async execute(context: RuntimeContext, stage: WorkflowStageConfig, next: () => Promise<unknown>) {
    context.logger.debug(`[${stage.id}] Starting`, { stage: stage.runtimeStage })
    try {
      const result = await next()
      context.logger.debug(`[${stage.id}] Completed`, { stage: stage.runtimeStage })
      return result
    } catch (error) {
      context.logger.error(`[${stage.id}] Failed`, {
        stage: stage.runtimeStage,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  },
}

export const MetricsMiddleware: Middleware = {
  id: 'metrics',
  name: 'Metrics Middleware',
  async execute(context: RuntimeContext, stage: WorkflowStageConfig, next: () => Promise<unknown>) {
    const startTime = Date.now()
    try {
      const result = await next()
      const duration = Date.now() - startTime
      recordMetric(context, stage.id, duration)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      recordFailure(context, stage.id)
      recordMetric(context, stage.id, duration)
      throw error
    }
  },
}

export const TimingMiddleware: Middleware = {
  id: 'timing',
  name: 'Timing Middleware',
  async execute(context: RuntimeContext, stage: WorkflowStageConfig, next: () => Promise<unknown>) {
    const startTime = Date.now()
    const result = await next()
    const duration = Date.now() - startTime
    context.metadata.lastStageDuration = duration
    context.metadata.stageDurations = {
      ...(context.metadata.stageDurations as Record<string, number>),
      [stage.id]: duration,
    }
    return result
  },
}

export const TimeoutMiddleware: Middleware = {
  id: 'timeout',
  name: 'Timeout Middleware',
  async execute(context: RuntimeContext, stage: WorkflowStageConfig, next: () => Promise<unknown>) {
    if (!stage.timeout) {
      return next()
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Stage '${stage.id}' timeout after ${stage.timeout}ms`)), stage.timeout),
    )

    return Promise.race([next(), timeoutPromise])
  },
}

export const ErrorMiddleware: Middleware = {
  id: 'error',
  name: 'Error Middleware',
  async execute(context: RuntimeContext, stage: WorkflowStageConfig, next: () => Promise<unknown>) {
    try {
      return await next()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      context.metadata.lastError = {
        stage: stage.id,
        message: err.message,
        timestamp: Date.now(),
      }
      throw err
    }
  },
}

export const RetryMiddleware: Middleware = {
  id: 'retry',
  name: 'Retry Middleware',
  async execute(context: RuntimeContext, stage: WorkflowStageConfig, next: () => Promise<unknown>) {
    const policy = stage.retryPolicy
    if (!policy) {
      return next()
    }

    let lastError: Error | undefined
    for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
      try {
        return await next()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < policy.maxAttempts - 1) {
          const delay = Math.min(policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt), policy.maxDelayMs)
          context.logger.debug(`[${stage.id}] Retry attempt ${attempt + 1}/${policy.maxAttempts}`, {
            delay,
            error: lastError.message,
          })
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('Retry exhausted')
  },
}

export function getBuiltinMiddleware(type: string): Middleware | undefined {
  const middlewares: Record<string, Middleware> = {
    logging: LoggingMiddleware,
    metrics: MetricsMiddleware,
    timing: TimingMiddleware,
    timeout: TimeoutMiddleware,
    error: ErrorMiddleware,
    retry: RetryMiddleware,
  }
  return middlewares[type]
}
