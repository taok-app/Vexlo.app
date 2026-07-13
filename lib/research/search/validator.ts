import { validateExecutionPlan } from '@/lib/research/planner/validator'
import type { ExecutionPlan } from '@/lib/research/planner/types'
import { canonicalizeQuery, safeQueryLength } from './query-builder'
import type { SearchStrategy, SearchTask, SearchValidationResult } from './types'
import { SearchAgentError, SearchAgentErrorCode } from './types'

export function validateSearchPlan(plan: ExecutionPlan): SearchValidationResult {
  const result = validateExecutionPlan(plan)
  return {
    valid: result.valid,
    errors: result.errors.map((error) => ({ code: error.code, message: error.message, field: error.field })),
    warnings: result.warnings,
  }
}

export function validateSearchTasks(
  tasks: SearchTask[],
  plan: ExecutionPlan,
  strategy: SearchStrategy,
): SearchValidationResult {
  const errors: SearchValidationResult['errors'] = []
  const warnings: string[] = []
  const taskIds = new Set(plan.tasks.map((task) => task.id))
  const seen = new Set<string>()
  if (tasks.length === 0)
    errors.push({ code: 'NO_SEARCH_TASKS', message: 'At least one valid search task is required', field: 'tasks' })
  if (tasks.length > strategy.maxSearches)
    errors.push({
      code: 'STRATEGY_LIMIT_EXCEEDED',
      message: `Search tasks exceed the ${strategy.depth} strategy limit`,
      field: 'tasks',
    })

  for (const task of tasks) {
    if (!safeQueryLength(task.query))
      errors.push({
        code: 'INVALID_QUERY',
        message: 'Query must contain 2-500 characters',
        field: 'query',
        taskId: task.id,
      })
    const key = canonicalizeQuery(task.query)
    if (seen.has(key))
      errors.push({
        code: 'DUPLICATE_QUERY',
        message: 'Search queries must be unique',
        field: 'query',
        taskId: task.id,
      })
    seen.add(key)
    if (task.planTaskId && !taskIds.has(task.planTaskId))
      errors.push({
        code: 'BROKEN_PLAN_REFERENCE',
        message: 'Search task references an unknown plan task',
        field: 'planTaskId',
        taskId: task.id,
      })
    if (task.confidence < 0 || task.confidence > 1)
      errors.push({
        code: 'INVALID_CONFIDENCE',
        message: 'Confidence must be between 0 and 1',
        field: 'confidence',
        taskId: task.id,
      })
    if (task.expectedUsefulness < 0 || task.expectedUsefulness > 1)
      errors.push({
        code: 'INVALID_USEFULNESS',
        message: 'Expected usefulness must be between 0 and 1',
        field: 'expectedUsefulness',
        taskId: task.id,
      })
    if (task.query.length > 250)
      warnings.push(`Query ${task.id} is long and may be interpreted inconsistently by providers.`)
  }
  return { valid: errors.length === 0, errors, warnings }
}

export function assertValidSearchPlan(plan: ExecutionPlan): void {
  const validation = validateSearchPlan(plan)
  if (!validation.valid)
    throw new SearchAgentError(
      SearchAgentErrorCode.INVALID_PLAN,
      'Execution plan is invalid for search generation',
      validation,
    )
}

export function assertValidSearchTasks(tasks: SearchTask[], plan: ExecutionPlan, strategy: SearchStrategy): void {
  const validation = validateSearchTasks(tasks, plan, strategy)
  if (!validation.valid)
    throw new SearchAgentError(SearchAgentErrorCode.NO_VALID_QUERIES, 'Generated search tasks are invalid', validation)
}
