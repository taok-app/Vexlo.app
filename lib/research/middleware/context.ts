import { createLogger } from '@/lib/logging'
import type { RuntimeStage, RuntimeEventType } from '@/lib/research/runtime/types'
import type { SimpleEventEmitter } from '@/lib/research/runtime/events'
import type { RuntimeContext, RuntimeMetrics } from './types'

export function createRuntimeContext(
  executionId: string,
  workflowId: string,
  currentStage: RuntimeStage,
  events: SimpleEventEmitter,
  abortSignal: AbortSignal,
): RuntimeContext {
  const logger = createLogger(`[Middleware:${executionId}]`)
  const metrics: Record<string, RuntimeMetrics> = {}

  return {
    executionId,
    workflowId,
    currentStage,
    logger: {
      info: (message: string, meta?: Record<string, unknown>) => {
        logger.info(message, meta)
      },
      error: (message: string, meta?: Record<string, unknown>) => {
        logger.error(message, meta)
      },
      debug: (message: string, meta?: Record<string, unknown>) => {
        logger.debug(message, meta)
      },
    },
    metrics,
    events,
    abortSignal,
    metadata: {},
  }
}

export function recordMetric(context: RuntimeContext, stage: string, durationMs: number): void {
  if (!context.metrics[stage]) {
    context.metrics[stage] = {
      executionCount: 0,
      failureCount: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
    }
  }

  const metric = context.metrics[stage]
  metric.executionCount++
  metric.totalDurationMs += durationMs
  metric.averageDurationMs = metric.totalDurationMs / metric.executionCount
}

export function recordFailure(context: RuntimeContext, stage: string): void {
  if (!context.metrics[stage]) {
    context.metrics[stage] = {
      executionCount: 0,
      failureCount: 0,
      totalDurationMs: 0,
      averageDurationMs: 0,
    }
  }
  context.metrics[stage].failureCount++
}
