import type { RuntimeStage, RuntimeEventType, RetryPolicy } from '@/lib/research/runtime/types'
import type { WorkflowStageConfig } from '@/lib/research/workflow/types'
import type { SimpleEventEmitter } from '@/lib/research/runtime/events'

export interface RuntimeMetrics {
  executionCount: number
  failureCount: number
  totalDurationMs: number
  averageDurationMs: number
}

export interface RuntimeContext {
  readonly executionId: string
  readonly workflowId: string
  readonly currentStage: RuntimeStage
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void
    error(message: string, meta?: Record<string, unknown>): void
    debug(message: string, meta?: Record<string, unknown>): void
  }
  readonly metrics: Record<string, RuntimeMetrics>
  readonly events: SimpleEventEmitter
  readonly abortSignal: AbortSignal
  metadata: Record<string, unknown>
}

export interface MiddlewareHooks {
  before?: (context: RuntimeContext, stage: WorkflowStageConfig) => Promise<void>
  after?: (context: RuntimeContext, stage: WorkflowStageConfig, result: unknown) => Promise<void>
  onError?: (context: RuntimeContext, stage: WorkflowStageConfig, error: Error) => Promise<void>
}

export type MiddlewareFunction = (
  context: RuntimeContext,
  stage: WorkflowStageConfig,
  next: () => Promise<unknown>,
) => Promise<unknown>

export interface Middleware {
  id: string
  name: string
  execute: MiddlewareFunction
  hooks?: MiddlewareHooks
}

export interface MiddlewareValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface MiddlewareRegistry {
  register(middleware: Middleware): void
  unregister(id: string): void
  resolve(id: string): Middleware | undefined
  getAll(): Middleware[]
  clear(): void
}

export interface MiddlewarePipelineOptions {
  abortSignal?: AbortSignal
  timeout?: number
}

export type BuiltinMiddlewareType = 'logging' | 'metrics' | 'timing' | 'retry' | 'timeout' | 'error'
