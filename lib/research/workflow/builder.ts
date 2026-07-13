import { createLogger } from '@/lib/logging'
import type { WorkflowDefinition, WorkflowStageConfig } from './types'
import { WorkflowValidator } from './validator'
import { WorkflowStage } from './stage'

const logger = createLogger('[Workflow.Builder]')

export class WorkflowBuilder {
  private id: string = ''
  private name: string = ''
  private description: string = ''
  private stages: WorkflowStageConfig[] = []
  private version: string = '1.0.0'
  private validator = new WorkflowValidator()

  setId(id: string): this {
    this.id = id
    return this
  }

  setName(name: string): this {
    this.name = name
    return this
  }

  setDescription(description: string): this {
    this.description = description
    return this
  }

  setVersion(version: string): this {
    this.version = version
    return this
  }

  addStage(config: Partial<WorkflowStageConfig>): this {
    if (!config.id) {
      throw new Error('Stage must have an id')
    }

    const stage: WorkflowStageConfig = {
      id: config.id,
      name: config.name || config.id,
      runtimeStage: config.runtimeStage || ('idle' as any),
      dependencies: config.dependencies || [],
      timeout: config.timeout || 60000,
      retryPolicy: config.retryPolicy,
      condition: config.condition,
      enabled: config.enabled !== false,
    }

    this.stages.push(stage)
    logger.debug(`[Builder] Added stage: ${stage.id}`)
    return this
  }

  removeStage(stageId: string): this {
    this.stages = this.stages.filter((s) => s.id !== stageId)
    logger.debug(`[Builder] Removed stage: ${stageId}`)
    return this
  }

  getStages(): WorkflowStageConfig[] {
    return [...this.stages]
  }

  build(): WorkflowDefinition {
    if (!this.id) {
      throw new Error('Workflow must have an id')
    }

    if (!this.name) {
      throw new Error('Workflow must have a name')
    }

    if (this.stages.length === 0) {
      throw new Error('Workflow must have at least one stage')
    }

    const workflow: WorkflowDefinition = {
      id: this.id,
      name: this.name,
      description: this.description,
      stages: [...this.stages],
      version: this.version,
      readonly: true,
    }

    const validationResult = this.validator.validate(workflow)
    if (!validationResult.valid) {
      logger.error('[Builder] Build failed validation', {
        workflowId: this.id,
        errors: validationResult.errors,
      })
      throw new Error(`Workflow validation failed: ${validationResult.errors.join('; ')}`)
    }

    logger.info('[Builder] Workflow built successfully', {
      id: workflow.id,
      stageCount: workflow.stages.length,
    })

    return workflow
  }

  clone(): WorkflowBuilder {
    const cloned = new WorkflowBuilder()
    cloned.id = this.id
    cloned.name = this.name
    cloned.description = this.description
    cloned.version = this.version
    cloned.stages = this.stages.map((s) => ({ ...s }))
    return cloned
  }

  static create(): WorkflowBuilder {
    return new WorkflowBuilder()
  }
}
