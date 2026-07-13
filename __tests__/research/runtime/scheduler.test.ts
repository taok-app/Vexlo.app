import { describe, expect, it, vi } from 'vitest'
import { BoundedScheduler } from '@/lib/research/runtime/scheduler'

describe('BoundedScheduler', () => {
  it('should execute task successfully', async () => {
    const scheduler = new BoundedScheduler(2)
    const task = {
      execute: vi.fn().mockResolvedValue('result'),
      label: 'test',
      priority: 1,
      timeout: 5000,
    }

    const result = await scheduler.schedule(task)

    expect(result).toBe('result')
    expect(task.execute).toHaveBeenCalled()
  })

  it('should respect max concurrent limit', async () => {
    const scheduler = new BoundedScheduler(2)
    let concurrent = 0
    let maxConcurrent = 0

    const createTask = (id: number) => ({
      execute: async () => {
        concurrent++
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await new Promise((resolve) => setTimeout(resolve, 50))
        concurrent--
        return id
      },
      label: `task-${id}`,
      priority: 1,
      timeout: 5000,
    })

    const promises = [1, 2, 3, 4, 5].map((id) => scheduler.schedule(createTask(id)))
    const results = await Promise.all(promises)

    expect(results).toEqual([1, 2, 3, 4, 5])
    expect(maxConcurrent).toBeLessThanOrEqual(2)
  })

  it('should prioritize higher priority tasks', async () => {
    const scheduler = new BoundedScheduler(1)
    const execution: string[] = []

    const task1 = {
      execute: async () => {
        execution.push('task1')
        await new Promise((r) => setTimeout(r, 10))
      },
      label: 'task1',
      priority: 1,
      timeout: 5000,
    }

    const task2 = {
      execute: async () => {
        execution.push('task2')
        await new Promise((r) => setTimeout(r, 10))
      },
      label: 'task2',
      priority: 10,
      timeout: 5000,
    }

    const p1 = scheduler.schedule(task1)
    const p2 = scheduler.schedule(task2)

    await Promise.all([p1, p2])

    expect(execution[1]).toBe('task2')
  })

  it('should timeout long-running tasks', async () => {
    const scheduler = new BoundedScheduler(1)
    const task = {
      execute: async () => new Promise((resolve) => setTimeout(resolve, 5000)),
      label: 'slow-task',
      priority: 1,
      timeout: 100,
    }

    await expect(scheduler.schedule(task)).rejects.toThrow()
  })

  it('should cancel pending tasks', async () => {
    const scheduler = new BoundedScheduler(1)
    const executed: string[] = []

    const task1 = {
      execute: async () => {
        executed.push('task1')
        await new Promise((r) => setTimeout(r, 100))
      },
      label: 'task1',
      priority: 1,
      timeout: 5000,
    }

    const task2 = {
      execute: async () => {
        executed.push('task2')
      },
      label: 'task2',
      priority: 1,
      timeout: 5000,
    }

    scheduler.schedule(task1)
    scheduler.schedule(task2)
    scheduler.cancel()

    await new Promise((r) => setTimeout(r, 200))

    expect(executed).toContain('task1')
  })

  it('should respect abort signal', async () => {
    const scheduler = new BoundedScheduler(1)
    const controller = new AbortController()

    const task = {
      execute: vi.fn().mockResolvedValue('result'),
      label: 'test',
      priority: 1,
      timeout: 5000,
    }

    controller.abort()

    await expect(scheduler.schedule(task, controller.signal)).rejects.toThrow('cancelled')
  })
})
