import type { RuntimeStage, RetryPolicy } from '@/lib/research/runtime/types'

export interface WorkflowStageConfig {
  id: string
  name: string
  runtimeStage: RuntimeStage
  dependencies: string[]
  timeout: number
  retryPolicy?: RetryPolicy
  condition?: (context: WorkflowContext) => boolean
  enabled: boolean
}

export interface WorkflowContext {
  stageResults: Record<string, unknown>
  input: unknown
  timestamp: number
}

export interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  stages: WorkflowStageConfig[]
  version: string
  metadata?: Record<string, unknown>
  readonly: boolean
}

export interface WorkflowValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface StageHandler {
  execute(): Promise<unknown>
}

export interface StageRegistry {
  register(stageId: string, handler: StageHandler): void
  resolve(stageId: string): StageHandler
  has(stageId: string): boolean
  getAll(): Map<string, StageHandler>
}

export interface WorkflowExecutionContext {
  workflow: WorkflowDefinition
  registry: StageRegistry
  context: WorkflowContext
}
