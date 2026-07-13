import type { Middleware, MiddlewareHooks, RuntimeContext } from './types'
import type { WorkflowStageConfig } from '@/lib/research/workflow/types'

export function createMiddlewareWithHooks(
  id: string,
  name: string,
  execute: (context: RuntimeContext, stage: WorkflowStageConfig, next: () => Promise<unknown>) => Promise<unknown>,
  hooks?: MiddlewareHooks,
): Middleware {
  return {
    id,
    name,
    execute,
    hooks,
  }
}

export function composeHooks(...hooksList: (MiddlewareHooks | undefined)[]): MiddlewareHooks {
  return {
    before: async (context: RuntimeContext, stage: WorkflowStageConfig) => {
      for (const hooks of hooksList) {
        if (hooks?.before) {
          await hooks.before(context, stage)
        }
      }
    },
    after: async (context: RuntimeContext, stage: WorkflowStageConfig, result: unknown) => {
      for (const hooks of hooksList) {
        if (hooks?.after) {
          await hooks.after(context, stage, result)
        }
      }
    },
    onError: async (context: RuntimeContext, stage: WorkflowStageConfig, error: Error) => {
      for (const hooks of hooksList) {
        if (hooks?.onError) {
          await hooks.onError(context, stage, error)
        }
      }
    },
  }
}
