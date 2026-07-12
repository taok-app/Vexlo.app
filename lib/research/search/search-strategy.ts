import { IntentType, ReasoningStrategy, type ExecutionPlan } from '@/lib/research/planner/types'
import { SearchDepth, type SearchGenerationOptions, type SearchStrategy } from './types'

const CONFIG: Record<SearchDepth, Omit<SearchStrategy, 'depth' | 'rationale'>> = {
  [SearchDepth.QUICK]: {
    maxSearches: 3,
    parallelism: 2,
    expectedDepth: 1,
    preferredSourceTypes: ['reference', 'official'],
  },
  [SearchDepth.STANDARD]: {
    maxSearches: 8,
    parallelism: 4,
    expectedDepth: 2,
    preferredSourceTypes: ['official', 'reference', 'news', 'academic'],
  },
  [SearchDepth.DEEP]: {
    maxSearches: 16,
    parallelism: 6,
    expectedDepth: 3,
    preferredSourceTypes: ['academic', 'official', 'primary', 'reference', 'news'],
  },
}

export function selectSearchStrategy(plan: ExecutionPlan, options: SearchGenerationOptions = {}): SearchStrategy {
  const dependencyCount = plan.tasks.reduce((total, task) => total + task.dependsOn.length, 0)
  const deepIntent = plan.intent === IntentType.ANALYTICAL || plan.intent === IntentType.DECISION_SUPPORT
  let depth = options.depth
  if (!depth) {
    if (
      plan.tasks.length >= 8 ||
      dependencyCount >= 6 ||
      deepIntent ||
      plan.reasoningStrategy === ReasoningStrategy.TREE
    )
      depth = SearchDepth.DEEP
    else if (plan.tasks.length <= 2 && dependencyCount === 0 && plan.estimatedTotalTokens <= 3_000)
      depth = SearchDepth.QUICK
    else depth = SearchDepth.STANDARD
  }
  const config = CONFIG[depth]
  return {
    depth,
    ...config,
    maxSearches: Math.max(1, Math.min(options.maxSearches ?? config.maxSearches, 50)),
    rationale: `${depth} search selected for ${plan.tasks.length} tasks and ${dependencyCount} dependencies`,
  }
}

export const SearchStrategySelector = { select: selectSearchStrategy }
