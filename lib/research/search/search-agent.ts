import { nanoid } from 'nanoid'
import { createLogger } from '@/lib/logging'
import { TaskPriority, type ExecutionPlan } from '@/lib/research/planner/types'
import { buildQueries, canonicalizeQuery, variantIntent, variantRationale, variantPriority } from './query-builder'
import { expandQueryVariants } from './query-expansion'
import { selectSearchStrategy } from './search-strategy'
import {
  SearchAgentError,
  SearchAgentErrorCode,
  type AIQuerySuggestion,
  type QueryVariant,
  type SearchAgentDependencies,
  type SearchGenerationOptions,
  type SearchGenerationResult,
  type SearchTask,
} from './types'
import { assertValidSearchPlan, assertValidSearchTasks, validateSearchTasks } from './validator'

const logger = createLogger('research-search-agent')

export class ResearchSearchAgent {
  constructor(
    private readonly dependencies: SearchAgentDependencies = {},
    private readonly defaults: SearchGenerationOptions = {},
  ) {}

  async generate(plan: ExecutionPlan, options: SearchGenerationOptions = {}): Promise<SearchGenerationResult> {
    const startedAt = Date.now()
    assertValidSearchPlan(plan)
    const mergedOptions = {
      ...this.defaults,
      ...options,
      expansion: { ...this.defaults.expansion, ...options.expansion },
    }
    const strategy = selectSearchStrategy(plan, mergedOptions)
    const warnings: string[] = []
    const built = buildQueries(plan)
    const expanded = await expandQueryVariants(built, this.dependencies.knowledge, mergedOptions.expansion)
    warnings.push(...expanded.warnings)
    const aiSuggestions = await this.optimize(
      plan,
      strategy,
      expanded.variants,
      mergedOptions.aiTimeoutMs ?? 2_500,
      warnings,
    )
    const candidates = this.mergeCandidates(expanded.variants, aiSuggestions)
    const deduplicatedCount = candidates.length
    const tasks = candidates
      .map((variant, index) => this.toTask(plan, variant, index))
      .sort((left, right) => right.expectedUsefulness - left.expectedUsefulness || right.confidence - left.confidence)
      .slice(0, strategy.maxSearches)

    if (tasks.length === 0)
      throw new SearchAgentError(SearchAgentErrorCode.NO_VALID_QUERIES, 'No valid search query could be generated')
    assertValidSearchTasks(tasks, plan, strategy)
    const validation = validateSearchTasks(tasks, plan, strategy)
    warnings.push(...validation.warnings)
    const aggregateConfidence = tasks.reduce((sum, task) => sum + task.confidence, 0) / tasks.length
    const durationMs = Date.now() - startedAt
    logger.info('Search tasks generated', {
      planId: plan.id,
      queries: tasks.map((task) => task.query),
      strategy: strategy.depth,
      aggregateConfidence,
      durationMs,
    })
    return {
      planId: plan.id,
      tasks,
      metadata: {
        strategy,
        generatedCount: candidates.length,
        deduplicatedCount,
        aggregateConfidence,
        durationMs,
        warnings,
      },
    }
  }

  private async optimize(
    plan: ExecutionPlan,
    strategy: ReturnType<typeof selectSearchStrategy>,
    candidates: QueryVariant[],
    timeoutMs: number,
    warnings: string[],
  ): Promise<AIQuerySuggestion[]> {
    if (!this.dependencies.ai) return []
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('AI optimization timed out')), Math.max(1, timeoutMs))
      })
      const output = await Promise.race([
        this.dependencies.ai.optimizeQueries({ objective: plan.objective, intent: plan.intent, strategy, candidates }),
        timeout,
      ])
      return output.filter((suggestion) => typeof suggestion.query === 'string' && suggestion.query.trim().length >= 2)
    } catch {
      warnings.push('AI query optimization was unavailable; deterministic queries were used.')
      return []
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  private mergeCandidates(variants: QueryVariant[], suggestions: AIQuerySuggestion[]): QueryVariant[] {
    const merged: QueryVariant[] = [
      ...suggestions.map((suggestion) => ({
        query: suggestion.query.trim(),
        kind: 'ai' as const,
        sourceTaskId: suggestion.sourceTaskId,
      })),
      ...variants,
    ]
    const seen = new Set<string>()
    return merged.filter((variant) => {
      const key = canonicalizeQuery(variant.query)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private toTask(plan: ExecutionPlan, variant: QueryVariant, index: number): SearchTask {
    const originalPriority = variantPriority(plan, variant)
    const priority = originalPriority ?? (index === 0 ? TaskPriority.HIGH : TaskPriority.NORMAL)
    const intent = variantIntent(plan, variant)
    const objectiveWords = new Set(plan.objective.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    const queryWords = variant.query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
    const overlap = queryWords.filter((word) => objectiveWords.has(word)).length
    const expectedUsefulness = Math.min(1, 0.55 + overlap * 0.05 + (variant.kind === 'ai' ? 0.1 : 0))
    const confidence = Math.min(1, 0.65 + (variant.kind === 'original' ? 0.15 : 0) + (variant.sourceTaskId ? 0.1 : 0))
    return {
      id: `search_${nanoid(10)}`,
      planTaskId: variant.sourceTaskId,
      query: variant.query,
      intent,
      priority,
      confidence,
      expectedUsefulness,
      language: variant.language,
      sourceTypes: intent === 'evidence' ? ['academic', 'primary', 'official'] : ['official', 'reference', 'news'],
      rationale: variantRationale(plan, variant),
    }
  }
}

export const SearchAgent = ResearchSearchAgent
