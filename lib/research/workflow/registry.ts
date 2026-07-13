import { createLogger } from '@/lib/logging'
import type { StageRegistry, StageHandler } from './types'

const logger = createLogger('[Workflow.Registry]')

export class DefaultStageRegistry implements StageRegistry {
  private handlers = new Map<string, StageHandler>()

  register(stageId: string, handler: StageHandler): void {
    if (!stageId || typeof stageId !== 'string') {
      throw new Error('Invalid stage id')
    }

    if (!handler || typeof handler.execute !== 'function') {
      throw new Error('Invalid stage handler')
    }

    if (this.handlers.has(stageId)) {
      logger.warn(`[Registry] Overwriting existing handler for stage: ${stageId}`)
    }

    this.handlers.set(stageId, handler)
    logger.debug(`[Registry] Registered handler for stage: ${stageId}`)
  }

  resolve(stageId: string): StageHandler {
    const handler = this.handlers.get(stageId)
    if (!handler) {
      throw new Error(`No handler registered for stage: ${stageId}`)
    }
    return handler
  }

  has(stageId: string): boolean {
    return this.handlers.has(stageId)
  }

  getAll(): Map<string, StageHandler> {
    return new Map(this.handlers)
  }

  clear(): void {
    this.handlers.clear()
    logger.debug('[Registry] Cleared all handlers')
  }
}
