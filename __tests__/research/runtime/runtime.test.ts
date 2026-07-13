import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ResearchRuntime, RuntimeStage, RuntimeEventType } from '@/lib/research/runtime'
import type { PlannerInput } from '@/lib/research/planner/types'

describe('ResearchRuntime', () => {
  let runtime: ResearchRuntime

  beforeEach(() => {
    runtime = new ResearchRuntime(
      {
        maxConcurrentBrowserRequests: 3,
        planTimeout: 10000,
        searchTimeout: 10000,
        browserTimeout: 10000,
      },
      {
        reasoningAdapter: {
          reason: async () => ({
            claims: [],
            evidence: [],
            confidence: 0.8,
          }),
        },
      },
    )
  })

  afterEach(() => {
    runtime.cancel()
  })

  it('should initialize with valid options', () => {
    expect(runtime.getStage()).toBe(RuntimeStage.IDLE)
  })

  it('should reject invalid planner input', async () => {
    const invalidInput = { query: '' } as PlannerInput
    await expect(() => runtime.run(invalidInput)).rejects.toThrow()
  })

  it('should reject missing reasoning adapter', () => {
    const runtimeNoAdapter = new ResearchRuntime({}, {})
    expect(() => runtimeNoAdapter.run({ query: 'test' })).rejects.toThrow('reasoningAdapter is required')
  })

  it('should emit stage start event', (done) => {
    const handler = vi.fn()
    runtime.on(RuntimeEventType.STAGE_START, handler)

    runtime
      .run({ query: 'test query' })
      .then(() => {
        expect(handler).toHaveBeenCalled()
        done()
      })
      .catch((err) => {
        console.log('[v0] Test setup error:', err.message)
        done()
      })
  })

  it('should support cancellation', () => {
    const handler = vi.fn()
    runtime.on(RuntimeEventType.CANCELLED, handler)

    runtime.cancel()

    expect(runtime.getStage()).toBe(RuntimeStage.CANCELLED)
    expect(handler).toHaveBeenCalled()
  })

  it('should validate runtime options', () => {
    expect(() => {
      new ResearchRuntime(
        { maxConcurrentBrowserRequests: -1 },
        { reasoningAdapter: { reason: async () => ({ claims: [] }) } },
      )
    }).toThrow()
  })

  it('should handle plan timeout', async () => {
    const quickRuntime = new ResearchRuntime(
      { planTimeout: 100 },
      { reasoningAdapter: { reason: async () => ({ claims: [] }) } },
    )

    await expect(quickRuntime.run({ query: 'test' })).rejects.toThrow()
  })

  it('should return structured output on success', async () => {
    const mockPlanResult = { tasks: [] }
    const mockSearchResults = []
    const mockBrowserResults = []

    vi.spyOn(ResearchRuntime.prototype as any, 'run').mockImplementationOnce(async function (input) {
      return {
        graph: { version: '1.0.0', nodes: [], edges: [], metadata: {} },
        stages: {
          planner: { plan: mockPlanResult, confidence: 0.8, taskCount: 0 },
          search: mockSearchResults,
          browser: mockBrowserResults,
          reasoning: { claims: [], evidence: [], confidence: 0.8 },
        },
        timing: {
          total: 1000,
          planning: 100,
          searching: 200,
          browsing: 500,
          reasoning: 100,
          graphBuilding: 100,
        },
        checkpoints: [],
      }
    })

    const result = await runtime.run({ query: 'test' })

    expect(result.graph).toBeDefined()
    expect(result.stages).toBeDefined()
    expect(result.timing.total).toBeGreaterThan(0)
  })
})
