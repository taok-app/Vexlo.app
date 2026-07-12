import { describe, expect, it } from 'vitest'
import {
  IntentType,
  ReasoningStrategy,
  TaskPriority,
  TaskType,
  createConfidenceScore,
  type ExecutionPlan,
} from '../../../lib/research/planner/types'
import {
  ResearchSearchAgent,
  SearchDepth,
  SearchAgentError,
  buildQueryVariants,
  canonicalizeQuery,
  deduplicateVariants,
  expandQueryVariants,
  selectSearchStrategy,
  validateSearchTasks,
} from '../../../lib/research/search'

function createPlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    id: 'plan_1',
    query: 'Compare "Next.js caching" with React caching 日本語',
    intent: IntentType.ANALYTICAL,
    objective: 'Compare Next.js caching behavior using primary evidence',
    tasks: [
      {
        id: 'task_search',
        type: TaskType.SEARCH,
        description: 'Find official Next.js caching documentation and independent evidence',
        priority: TaskPriority.HIGH,
        dependsOn: [],
        expectedOutput: 'Relevant sources',
      },
    ],
    searchQueries: [
      {
        id: 'query_1',
        query: { query: 'Next.js caching official documentation', language: 'en' },
        rationale: 'Find primary documentation',
        supportsTask: 'task_search',
        priority: TaskPriority.HIGH,
      },
    ],
    requiredTools: { searchProviders: ['web'], browserNeeded: true, reasoningNeeded: true, critiqueNeeded: false },
    expectedOutputs: ['Comparison'],
    reasoningStrategy: ReasoningStrategy.PARALLEL,
    confidence: createConfidenceScore(0.9),
    reasoning: 'Search primary and independent sources before comparison.',
    estimatedTotalTokens: 6_000,
    createdAt: new Date('2026-07-12T00:00:00.000Z'),
    ...overrides,
  }
}

describe('query building', () => {
  it('preserves planner queries and builds intent-aware multilingual variants', () => {
    const variants = buildQueryVariants(createPlan())
    expect(variants.some((item) => item.kind === 'original')).toBe(true)
    expect(variants.some((item) => item.kind === 'boolean')).toBe(true)
    expect(variants.some((item) => item.language === 'multilingual')).toBe(true)
  })

  it('canonicalizes and deduplicates equivalent queries', () => {
    const variants = deduplicateVariants([
      { query: '"Next.js" AND caching', kind: 'boolean' },
      { query: 'next.js caching', kind: 'natural' },
    ])
    expect(canonicalizeQuery('"Next.js" AND caching')).toBe(canonicalizeQuery('next.js caching'))
    expect(variants).toHaveLength(1)
  })
})

describe('query expansion', () => {
  it('honors expansion categories and deduplicates adapter output', async () => {
    const result = await expandQueryVariants(
      [{ query: 'AI security', kind: 'natural' }],
      {
        expandQuery: async () => [
          { term: 'artificial intelligence', category: 'abbreviation' },
          { term: 'threat modeling', category: 'narrower' },
        ],
      },
      { categories: ['abbreviation'], maxVariantsPerQuery: 3 },
    )
    expect(result.variants.some((item) => item.query.includes('artificial intelligence'))).toBe(true)
    expect(result.variants.some((item) => item.query.includes('threat modeling'))).toBe(false)
  })

  it('falls back when knowledge expansion fails', async () => {
    const result = await expandQueryVariants([{ query: 'API security', kind: 'natural' }], {
      expandQuery: async () => {
        throw new Error('unavailable')
      },
    })
    expect(result.variants.length).toBeGreaterThan(1)
    expect(result.warnings).toHaveLength(1)
  })
})

describe('strategy and validation', () => {
  it('selects quick, standard, and deep strategies', () => {
    expect(selectSearchStrategy(createPlan(), { depth: SearchDepth.QUICK }).depth).toBe(SearchDepth.QUICK)
    expect(selectSearchStrategy(createPlan({ intent: IntentType.INFORMATIONAL })).depth).toBe(SearchDepth.STANDARD)
    expect(selectSearchStrategy(createPlan()).depth).toBe(SearchDepth.DEEP)
  })

  it('rejects duplicate and malformed tasks', () => {
    const plan = createPlan()
    const strategy = selectSearchStrategy(plan)
    const tasks = [
      {
        id: 'a',
        query: 'same query',
        intent: 'discovery' as const,
        priority: TaskPriority.NORMAL,
        confidence: 0.8,
        expectedUsefulness: 0.8,
        sourceTypes: [],
        rationale: 'test',
      },
      {
        id: 'b',
        query: 'Same Query',
        intent: 'discovery' as const,
        priority: TaskPriority.NORMAL,
        confidence: 2,
        expectedUsefulness: 0.8,
        sourceTypes: [],
        rationale: 'test',
      },
    ]
    const result = validateSearchTasks(tasks, plan, strategy)
    expect(result.valid).toBe(false)
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining(['DUPLICATE_QUERY', 'INVALID_CONFIDENCE']),
    )
  })
})

describe('ResearchSearchAgent', () => {
  it('generates prioritized structured tasks end to end', async () => {
    const result = await new ResearchSearchAgent().generate(createPlan())
    expect(result.tasks.length).toBeGreaterThan(0)
    expect(result.tasks.length).toBeLessThanOrEqual(result.metadata.strategy.maxSearches)
    expect(result.metadata.aggregateConfidence).toBeGreaterThan(0)
    expect(new Set(result.tasks.map((task) => canonicalizeQuery(task.query))).size).toBe(result.tasks.length)
  })

  it('uses deterministic output for malformed AI output and timeouts', async () => {
    const malformed = new ResearchSearchAgent({ ai: { optimizeQueries: async () => [{ query: '' }] } })
    expect((await malformed.generate(createPlan())).tasks.length).toBeGreaterThan(0)

    const slow = new ResearchSearchAgent({ ai: { optimizeQueries: async () => new Promise(() => undefined) } })
    const result = await slow.generate(createPlan(), { aiTimeoutMs: 5 })
    expect(result.tasks.length).toBeGreaterThan(0)
    expect(result.metadata.warnings.some((warning) => warning.includes('AI query optimization'))).toBe(true)
  })

  it('fails fast for invalid plans', async () => {
    await expect(new ResearchSearchAgent().generate(createPlan({ id: '' }))).rejects.toBeInstanceOf(SearchAgentError)
  })
})
