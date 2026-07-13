import { createLogger } from '@/lib/logging'
import type { WorkflowDefinition, WorkflowContext, StageRegistry } from './types'
import { WorkflowStage } from './stage'

const logger = createLogger('[Workflow.Pipeline]')

export class WorkflowPipeline {
  private workflow: WorkflowDefinition
  private registry: StageRegistry
  private stages: Map<string, WorkflowStage>

  constructor(workflow: WorkflowDefinition, registry: StageRegistry) {
    this.workflow = workflow
    this.registry = registry
    this.stages = new Map(workflow.stages.map((config) => [config.id, new WorkflowStage(config)]))

    logger.info('[Pipeline] Initialized', {
      workflowId: workflow.id,
      stageCount: this.stages.size,
    })
  }

  getStages(): WorkflowStage[] {
    return Array.from(this.stages.values())
  }

  getStage(stageId: string): WorkflowStage | undefined {
    return this.stages.get(stageId)
  }

  getExecutionOrder(context: WorkflowContext): string[] {
    const order: string[] = []
    const visited = new Set<string>()

    for (const stage of this.workflow.stages) {
      if (!visited.has(stage.id)) {
        this.topologicalSort(stage.id, visited, order, context)
      }
    }

    return order
  }

  private topologicalSort(stageId: string, visited: Set<string>, order: string[], context: WorkflowContext): void {
    if (visited.has(stageId)) return

    visited.add(stageId)
    const stage = this.stages.get(stageId)

    if (stage) {
      // Process dependencies first
      for (const depId of stage.getDependencies()) {
        this.topologicalSort(depId, visited, order, context)
      }

      // Add current stage if it should execute
      if (stage.shouldExecute(context)) {
        order.push(stageId)
      }
    }
  }

  getEnabledStages(): WorkflowStage[] {
    return Array.from(this.stages.values()).filter((s) => s.isEnabled())
  }

  getDisabledStages(): WorkflowStage[] {
    return Array.from(this.stages.values()).filter((s) => !s.isEnabled())
  }

  resolveStageHandler(stageId: string) {
    const stage = this.stages.get(stageId)
    if (!stage) {
      throw new Error(`Stage not found: ${stageId}`)
    }

    if (!this.registry.has(stageId)) {
      throw new Error(`No handler registered for stage: ${stageId}`)
    }

    return this.registry.resolve(stageId)
  }

  getWorkflowDefinition(): Readonly<WorkflowDefinition> {
    return this.workflow
  }
}
