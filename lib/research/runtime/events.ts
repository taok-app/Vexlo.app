import { RuntimeEventType, RuntimeStage, type RuntimeProgress } from './types'

export interface RuntimeEvent {
  type: RuntimeEventType
  timestamp: number
  stage: RuntimeStage
  data: unknown
}

export interface RuntimeEventEmitter {
  on(event: RuntimeEventType, handler: (data: RuntimeEvent) => void): void
  off(event: RuntimeEventType, handler: (data: RuntimeEvent) => void): void
  emit(event: RuntimeEvent): void
}

export class SimpleEventEmitter implements RuntimeEventEmitter {
  private listeners = new Map<RuntimeEventType, Set<(data: RuntimeEvent) => void>>()

  on(event: RuntimeEventType, handler: (data: RuntimeEvent) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(handler)
  }

  off(event: RuntimeEventType, handler: (data: RuntimeEvent) => void): void {
    this.listeners.get(event)?.delete(handler)
  }

  emit(event: RuntimeEvent): void {
    const handlers = this.listeners.get(event.type)
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event)
        } catch (error) {
          console.error('[v0] Event handler error:', error)
        }
      }
    }
  }
}

export function createProgressEvent(stage: RuntimeStage, progress: RuntimeProgress): RuntimeEvent {
  return {
    type: RuntimeEventType.PROGRESS,
    timestamp: Date.now(),
    stage,
    data: progress,
  }
}

export function createCheckpointEvent(stage: RuntimeStage, data: unknown): RuntimeEvent {
  return {
    type: RuntimeEventType.CHECKPOINT,
    timestamp: Date.now(),
    stage,
    data,
  }
}

export function createStageStartEvent(stage: RuntimeStage): RuntimeEvent {
  return {
    type: RuntimeEventType.STAGE_START,
    timestamp: Date.now(),
    stage,
    data: null,
  }
}

export function createStageCompleteEvent(stage: RuntimeStage, data: unknown): RuntimeEvent {
  return {
    type: RuntimeEventType.STAGE_COMPLETE,
    timestamp: Date.now(),
    stage,
    data,
  }
}

export function createStageErrorEvent(stage: RuntimeStage, error: Error): RuntimeEvent {
  return {
    type: RuntimeEventType.STAGE_ERROR,
    timestamp: Date.now(),
    stage,
    data: { message: error.message, code: error.name },
  }
}
