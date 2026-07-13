import { createLogger } from '@/lib/logging'

const logger = createLogger('[Runtime.Scheduler]')

export interface ScheduledTask<T> {
  execute(): Promise<T>
  label: string
  priority: number
  timeout: number
}

export class BoundedScheduler {
  private queue: ScheduledTask<unknown>[] = []
  private running = 0
  private maxConcurrent: number

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = Math.max(1, maxConcurrent)
  }

  async schedule<T>(task: ScheduledTask<T>, signal?: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Scheduler task cancelled before queuing'))
        return
      }

      const abortHandler = () => {
        const index = this.queue.indexOf(queuedTask as ScheduledTask<unknown>)
        if (index >= 0) {
          this.queue.splice(index, 1)
        }
        reject(new Error('Scheduler task cancelled while queued'))
      }

      const queuedTask: ScheduledTask<T> = {
        ...task,
        execute: async () => {
          signal?.addEventListener('abort', abortHandler)
          try {
            if (signal?.aborted) throw new Error('Task cancelled before execution')
            return await this.executeWithTimeout(task.execute, task.timeout, task.label)
          } finally {
            signal?.removeEventListener('abort', abortHandler)
          }
        },
      }

      this.queue.push(queuedTask as ScheduledTask<unknown>)
      this.queue.sort((a, b) => b.priority - a.priority)

      Promise.resolve()
        .then(() => this.process(queuedTask as ScheduledTask<unknown>))
        .then(resolve)
        .catch(reject)
    })
  }

  private async process<T>(task: ScheduledTask<T>): Promise<T> {
    while (this.running >= this.maxConcurrent) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    this.running++
    try {
      return await task.execute()
    } finally {
      this.running--
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number, label: string): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Task "${label}" exceeded timeout of ${timeout}ms`)), timeout),
      ),
    ])
  }

  cancel(): void {
    this.queue = []
    logger.info('[Runtime] Scheduler cancelled all pending tasks')
  }
}
