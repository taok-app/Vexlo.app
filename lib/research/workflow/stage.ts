import type { RuntimeStage, RetryPolicy } from '@/lib/research/runtime/types'
import { DEFAULT_RETRY_POLICY } from '@/lib/research/runtime/retry'
import type { WorkflowStageConfig, WorkflowContext } from './types'

export class WorkflowStage {
  private config: WorkflowStageConfig

  constructor(config: WorkflowStageConfig) {
    this.config = Object.freeze({ ...config })
  }

  getId(): string {
    return this.config.id
  }

  getName(): string {
    return this.config.name
  }

  getRuntimeStage(): RuntimeStage {
    return this.config.runtimeStage
  }

  getDependencies(): string[] {
    return [...this.config.dependencies]
  }

  getTimeout(): number {
    return this.config.timeout
  }

  getRetryPolicy(): RetryPolicy {
    return this.config.retryPolicy ?? DEFAULT_RETRY_POLICY
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  shouldExecute(context: WorkflowContext): boolean {
    if (!this.config.enabled) return false
    if (this.config.condition) {
      return this.config.condition(context)
    }
    return true
  }

  getConfig(): Readonly<WorkflowStageConfig> {
    return this.config
  }

  static create(config: Partial<WorkflowStageConfig>): WorkflowStage {
    const fullConfig: WorkflowStageConfig = {
      id: config.id || '',
      name: config.name || '',
      runtimeStage: config.runtimeStage || ('idle' as RuntimeStage),
      dependencies: config.dependencies || [],
      timeout: config.timeout || 60000,
      retryPolicy: config.retryPolicy,
      condition: config.condition,
      enabled: config.enabled !== false,
    }
    return new WorkflowStage(fullConfig)
  }
}
