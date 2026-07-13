import { createLogger } from '@/lib/logging'
import type { Middleware, RuntimeContext, MiddlewarePipelineOptions } from './types'
import type { WorkflowStageConfig } from '@/lib/research/workflow/types'
import { MiddlewarePipeline } from './pipeline'
import { validateMiddlewareList } from './validator'

const logger = createLogger('[Middleware.Executor]')

export class MiddlewareExecutor {
  constructor(private middlewares: Middleware[]) {
    const validation = validateMiddlewareList(middlewares)
    if (!validation.valid) {
      logger.error('Invalid middleware configuration', { errors: validation.errors })
      throw new Error(`Invalid middleware: ${validation.errors.join('; ')}`)
    }
  }

  async execute(
    context: RuntimeContext,
    stage: WorkflowStageConfig,
    stageExecutor: () => Promise<unknown>,
    options: MiddlewarePipelineOptions = {},
  ): Promise<unknown> {
    const pipeline = new MiddlewarePipeline(this.middlewares)

    try {
      return await pipeline.execute(context, stage, stageExecutor, options)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error(`Middleware executor failed for stage '${stage.id}'`, {
        error: err.message,
        middlewareCount: this.middlewares.length,
      })
      throw err
    }
  }

  getMiddlewares(): Middleware[] {
    return [...this.middlewares]
  }

  getMiddlewareCount(): number {
    return this.middlewares.length
  }
}
