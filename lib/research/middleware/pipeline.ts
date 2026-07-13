import type { Middleware, RuntimeContext, MiddlewarePipelineOptions } from './types'
import type { WorkflowStageConfig } from '@/lib/research/workflow/types'

export class MiddlewarePipeline {
  constructor(private middlewares: Middleware[]) {}

  async execute(
    context: RuntimeContext,
    stage: WorkflowStageConfig,
    stageExecutor: () => Promise<unknown>,
    options: MiddlewarePipelineOptions = {},
  ): Promise<unknown> {
    const { abortSignal, timeout } = options

    // Check if abort signal is already aborted
    if (abortSignal?.aborted) {
      throw new Error('Execution aborted before middleware pipeline started')
    }

    // Build the middleware chain
    let index = 0
    let result: unknown = undefined
    let isAborted = false

    const next = async (): Promise<unknown> => {
      // Check abort signal
      if (abortSignal?.aborted) {
        throw new Error('Execution cancelled during middleware pipeline')
      }

      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++]

        try {
          // Execute before hooks
          if (middleware.hooks?.before) {
            await this.executeWithTimeout(
              () => middleware.hooks!.before!(context, stage),
              `${middleware.id}:before`,
              timeout,
            )
          }

          // Execute middleware
          result = await this.executeWithTimeout(() => middleware.execute(context, stage, next), middleware.id, timeout)

          // Execute after hooks
          if (middleware.hooks?.after) {
            await this.executeWithTimeout(
              () => middleware.hooks!.after!(context, stage, result),
              `${middleware.id}:after`,
              timeout,
            )
          }

          return result
        } catch (error) {
          // Execute error hooks
          if (middleware.hooks?.onError && error instanceof Error) {
            await this.executeWithTimeout(
              () => middleware.hooks!.onError!(context, stage, error),
              `${middleware.id}:onError`,
              timeout,
            ).catch((hookError) => {
              context.logger.error(`Error in ${middleware.id}:onError hook`, {
                error: hookError instanceof Error ? hookError.message : String(hookError),
              })
            })
          }

          throw error
        }
      } else {
        // All middleware executed, call the actual stage executor
        return stageExecutor()
      }
    }

    try {
      // Set up abort signal listener
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          isAborted = true
        })
      }

      return await next()
    } catch (error) {
      if (isAborted || (error instanceof Error && error.message.includes('Execution cancelled'))) {
        throw new Error(`Middleware pipeline cancelled during stage '${stage.id}'`)
      }
      throw error
    }
  }

  private async executeWithTimeout(fn: () => Promise<unknown>, label: string, timeoutMs?: number): Promise<unknown> {
    if (!timeoutMs) {
      return fn()
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs),
    )

    return Promise.race([fn(), timeoutPromise])
  }
}
