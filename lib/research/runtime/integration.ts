import { createLogger } from '@/lib/logging'
import type { WorkflowDefinition, StageRegistry, WorkflowContext } from '@/lib/research/workflow/types'
import { WorkflowPipeline } from '@/lib/research/workflow/pipeline'
import { WorkflowValidator } from '@/lib/research/workflow/validator'
import { MiddlewareExecutor } from '@/lib/research/middleware/executor'
import { MiddlewarePipeline } from '@/lib/research/middleware/pipeline'
import { createRuntimeContext } from '@/lib/research/middleware/context'
import type { Middleware, RuntimeContext } from '@/lib/research/middleware/types'
import type { SimpleEventEmitter } from './events'
import type { RuntimeStage } from './types'

const logger = createLogger('[Runtime.Integration]')

export class RuntimeWorkflowIntegration {
  private pipeline: WorkflowPipeline
  private middlewareExecutor: MiddlewareExecutor
  private workflowValidator: WorkflowValidator

  constructor(workflow: WorkflowDefinition, registry: StageRegistry, middlewares: Middleware[] = []) {
    // Validate workflow
    this.workflowValidator = new WorkflowValidator()
    const validation = this.workflowValidator.validate(workflow)
    if (!validation.valid) {
      const errors = validation.errors.join('; ')
      logger.error('[Integration] Workflow validation failed', { errors })
      throw new Error(`Invalid workflow: ${errors}`)
    }

    // Initialize pipeline and executor
    this.pipeline = new WorkflowPipeline(workflow, registry)
    this.middlewareExecutor = new MiddlewareExecutor(middlewares)

    logger.info('[Integration] Initialized', {
      workflowId: workflow.id,
      stageCount: workflow.stages.length,
      middlewareCount: middlewares.length,
    })
  }

  async executeStage(
    stageId: string,
    context: RuntimeContext,
    stageExecutor: () => Promise<unknown>,
  ): Promise<unknown> {
    const stage = this.pipeline.getStage(stageId)
    if (!stage) {
      throw new Error(`Stage not found: ${stageId}`)
    }

    // Execute through middleware pipeline
    return this.middlewareExecutor.execute(context, stage.getConfig() as any, stageExecutor, {
      abortSignal: context.abortSignal,
    })
  }

  getExecutionOrder(context: WorkflowContext): string[] {
    return this.pipeline.getExecutionOrder(context)
  }

  getPipeline(): WorkflowPipeline {
    return this.pipeline
  }

  getStageRegistry(): StageRegistry {
    const def = this.pipeline.getWorkflowDefinition()
    return {
      register() {},
      resolve(stageId: string) {
        throw new Error(`StageRegistry method not available in integration: ${stageId}`)
      },
      has() {
        return false
      },
      getAll() {
        return new Map()
      },
    }
  }
}
