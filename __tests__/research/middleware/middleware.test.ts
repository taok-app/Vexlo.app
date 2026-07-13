import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Middleware, RuntimeContext } from '@/lib/research/middleware'
import {
  MiddlewareExecutor,
  DefaultMiddlewareRegistry,
  createRuntimeContext,
  recordMetric,
  recordFailure,
  validateMiddleware,
  validateMiddlewareList,
  LoggingMiddleware,
  MetricsMiddleware,
  TimingMiddleware,
  TimeoutMiddleware,
  ErrorMiddleware,
  RetryMiddleware,
  createMiddlewareWithHooks,
  composeHooks,
  getBuiltinMiddleware,
} from '@/lib/research/middleware'
import { SimpleEventEmitter } from '@/lib/research/runtime/events'
import { RuntimeStage } from '@/lib/research/runtime/types'

vi.mock('server-only', () => ({}))

describe('Middleware Layer', () => {
  let context: RuntimeContext
  let stageConfig: any
  let emitter: SimpleEventEmitter

  beforeEach(() => {
    emitter = new SimpleEventEmitter()
    context = createRuntimeContext('exec-1', 'workflow-1', RuntimeStage.PLANNING, emitter, new AbortController().signal)
    stageConfig = {
      id: 'planning',
      name: 'Planning Stage',
      runtimeStage: RuntimeStage.PLANNING,
      dependencies: [],
      timeout: 10000,
      enabled: true,
    }
  })

  describe('Registry', () => {
    it('should register and resolve middleware', () => {
      const registry = new DefaultMiddlewareRegistry()
      const middleware = LoggingMiddleware

      registry.register(middleware)
      expect(registry.resolve(middleware.id)).toBe(middleware)
    })

    it('should prevent duplicate middleware registration', () => {
      const registry = new DefaultMiddlewareRegistry()
      registry.register(LoggingMiddleware)

      expect(() => registry.register(LoggingMiddleware)).toThrow('already registered')
    })

    it('should unregister middleware', () => {
      const registry = new DefaultMiddlewareRegistry()
      registry.register(LoggingMiddleware)
      registry.unregister(LoggingMiddleware.id)

      expect(registry.resolve(LoggingMiddleware.id)).toBeUndefined()
    })

    it('should clear all middleware', () => {
      const registry = new DefaultMiddlewareRegistry()
      registry.register(LoggingMiddleware)
      registry.register(MetricsMiddleware)
      registry.clear()

      expect(registry.getAll()).toHaveLength(0)
    })
  })

  describe('Validator', () => {
    it('should validate correct middleware', () => {
      const result = validateMiddleware(LoggingMiddleware)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject middleware with missing id', () => {
      const invalidMiddleware: Middleware = {
        id: '',
        name: 'Test',
        execute: async () => undefined,
      }

      const result = validateMiddleware(invalidMiddleware)
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('id'))).toBe(true)
    })

    it('should detect duplicate middleware ids', () => {
      const result = validateMiddlewareList([LoggingMiddleware, LoggingMiddleware])
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true)
    })
  })

  describe('Context', () => {
    it('should create runtime context with correct fields', () => {
      expect(context.executionId).toBe('exec-1')
      expect(context.workflowId).toBe('workflow-1')
      expect(context.currentStage).toBe(RuntimeStage.PLANNING)
      expect(context.metrics).toEqual({})
      expect(context.metadata).toEqual({})
    })

    it('should record metrics', () => {
      recordMetric(context, 'planning', 1000)
      expect(context.metrics['planning'].executionCount).toBe(1)
      expect(context.metrics['planning'].totalDurationMs).toBe(1000)

      recordMetric(context, 'planning', 2000)
      expect(context.metrics['planning'].executionCount).toBe(2)
      expect(context.metrics['planning'].averageDurationMs).toBe(1500)
    })

    it('should record failures', () => {
      recordFailure(context, 'planning')
      expect(context.metrics['planning'].failureCount).toBe(1)
    })
  })

  describe('Middleware Composition', () => {
    it('should execute middleware in order', async () => {
      const order: string[] = []

      const middleware1: Middleware = {
        id: 'first',
        name: 'First',
        async execute(ctx, stage, next) {
          order.push('before-1')
          const result = await next()
          order.push('after-1')
          return result
        },
      }

      const middleware2: Middleware = {
        id: 'second',
        name: 'Second',
        async execute(ctx, stage, next) {
          order.push('before-2')
          const result = await next()
          order.push('after-2')
          return result
        },
      }

      const executor = new MiddlewareExecutor([middleware1, middleware2])
      await executor.execute(context, stageConfig, () => {
        order.push('stage')
        return Promise.resolve('result')
      })

      expect(order).toEqual(['before-1', 'before-2', 'stage', 'after-2', 'after-1'])
    })

    it('should handle middleware error propagation', async () => {
      const errorMiddleware: Middleware = {
        id: 'error',
        name: 'Error',
        async execute(ctx, stage, next) {
          throw new Error('Middleware error')
        },
      }

      const executor = new MiddlewareExecutor([errorMiddleware])
      await expect(executor.execute(context, stageConfig, () => Promise.resolve())).rejects.toThrow('Middleware error')
    })

    it('should support middleware cancellation via AbortSignal', { timeout: 10000 }, async () => {
      const abortController = new AbortController()
      const cancelContext = createRuntimeContext(
        'exec-1',
        'workflow-1',
        RuntimeStage.PLANNING,
        emitter,
        abortController.signal,
      )

      const slowMiddleware: Middleware = {
        id: 'slow',
        name: 'Slow',
        async execute(ctx, stage, next) {
          if (ctx.abortSignal.aborted) {
            throw new Error('Cancelled')
          }
          return next()
        },
      }

      const executor = new MiddlewareExecutor([slowMiddleware])
      abortController.abort()

      await expect(executor.execute(cancelContext, stageConfig, () => Promise.resolve())).rejects.toThrow()
    })
  })

  describe('Built-in Middleware', () => {
    it('should include logging middleware', () => {
      expect(LoggingMiddleware.id).toBe('logging')
      expect(LoggingMiddleware.execute).toBeDefined()
    })

    it('should include metrics middleware', () => {
      expect(MetricsMiddleware.id).toBe('metrics')
    })

    it('should include timing middleware', () => {
      expect(TimingMiddleware.id).toBe('timing')
    })

    it('should include timeout middleware', () => {
      expect(TimeoutMiddleware.id).toBe('timeout')
    })

    it('should include error middleware', () => {
      expect(ErrorMiddleware.id).toBe('error')
    })

    it('should include retry middleware', () => {
      expect(RetryMiddleware.id).toBe('retry')
    })

    it('should resolve builtin middleware by type', () => {
      expect(getBuiltinMiddleware('logging')).toBe(LoggingMiddleware)
      expect(getBuiltinMiddleware('metrics')).toBe(MetricsMiddleware)
      expect(getBuiltinMiddleware('retry')).toBe(RetryMiddleware)
      expect(getBuiltinMiddleware('unknown')).toBeUndefined()
    })
  })

  describe('Hooks', () => {
    it('should execute before hooks', async () => {
      const hookExecuted: string[] = []

      const middleware: Middleware = createMiddlewareWithHooks('test', 'Test', async (ctx, stage, next) => next(), {
        before: async (ctx, stage) => {
          hookExecuted.push('before')
        },
      })

      const executor = new MiddlewareExecutor([middleware])
      await executor.execute(context, stageConfig, () => Promise.resolve())

      expect(hookExecuted).toContain('before')
    })

    it('should execute after hooks', async () => {
      const hookExecuted: string[] = []

      const middleware: Middleware = createMiddlewareWithHooks('test', 'Test', async (ctx, stage, next) => next(), {
        after: async (ctx, stage, result) => {
          hookExecuted.push('after')
        },
      })

      const executor = new MiddlewareExecutor([middleware])
      await executor.execute(context, stageConfig, () => Promise.resolve())

      expect(hookExecuted).toContain('after')
    })

    it('should compose multiple hooks', async () => {
      const order: string[] = []

      const hooks1 = {
        before: async () => order.push('before-1'),
        after: async () => order.push('after-1'),
      }

      const hooks2 = {
        before: async () => order.push('before-2'),
        after: async () => order.push('after-2'),
      }

      const composed = composeHooks(hooks1, hooks2)
      await composed.before!(context, stageConfig)
      await composed.after!(context, stageConfig, undefined)

      expect(order).toEqual(['before-1', 'before-2', 'after-1', 'after-2'])
    })
  })

  describe('Timeout', () => {
    it('should timeout stage after specified duration', async () => {
      stageConfig.timeout = 100

      const slowStage = () =>
        new Promise((resolve) => {
          setTimeout(() => resolve('result'), 500)
        })

      const executor = new MiddlewareExecutor([TimeoutMiddleware])
      await expect(executor.execute(context, stageConfig, slowStage)).rejects.toThrow('timeout')
    })
  })

  describe('Retry', () => {
    it('should retry failed stage', async () => {
      let attempts = 0
      stageConfig.retryPolicy = {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      }

      const failingStage = () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Stage failed')
        }
        return Promise.resolve('success')
      }

      const executor = new MiddlewareExecutor([RetryMiddleware])
      const result = await executor.execute(context, stageConfig, failingStage)

      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should exhaust retries and throw', async () => {
      stageConfig.retryPolicy = {
        maxAttempts: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      }

      const alwaysFails = () => Promise.reject(new Error('Always fails'))

      const executor = new MiddlewareExecutor([RetryMiddleware])
      await expect(executor.execute(context, stageConfig, alwaysFails)).rejects.toThrow()
    })
  })

  describe('Full Pipeline', () => {
    it('should execute complete middleware pipeline', async () => {
      const events: string[] = []

      const testMiddleware: Middleware = {
        id: 'test',
        name: 'Test',
        async execute(ctx, stage, next) {
          events.push('middleware-start')
          const result = await next()
          events.push('middleware-end')
          return result
        },
      }

      const executor = new MiddlewareExecutor([LoggingMiddleware, testMiddleware, MetricsMiddleware])
      const result = await executor.execute(context, stageConfig, () => {
        events.push('stage-execute')
        return Promise.resolve('stage-result')
      })

      expect(result).toBe('stage-result')
      expect(events).toContain('middleware-start')
      expect(events).toContain('stage-execute')
      expect(events).toContain('middleware-end')
      expect(context.metrics['planning']).toBeDefined()
    })
  })
})
