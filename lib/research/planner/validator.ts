/**
 * Planner Agent Validator
 *
 * Validates execution plans for consistency, completeness, and feasibility.
 */

import type { ExecutionPlan, ValidationResult, ValidationError, PlanTask, GeneratedSearchQuery } from './types'

/**
 * Validate an entire execution plan
 */
export function validateExecutionPlan(plan: ExecutionPlan): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: string[] = []

  // Validate basic structure
  validateBasicStructure(plan, errors)

  // Validate tasks
  validateTasks(plan.tasks, errors, warnings)

  // Validate task dependencies
  validateTaskDependencies(plan.tasks, errors)

  // Validate search queries
  validateSearchQueries(plan.searchQueries, plan.tasks, errors)

  // Validate cross-references
  validateCrossReferences(plan, errors)

  // Validate confidence score
  validateConfidenceScore(plan.confidence, errors)

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate basic plan structure
 */
function validateBasicStructure(plan: ExecutionPlan, errors: ValidationError[]): void {
  if (!plan.id || plan.id.trim().length === 0) {
    errors.push({
      code: 'MISSING_ID',
      message: 'Plan must have a non-empty ID',
      field: 'id',
    })
  }

  if (!plan.query || plan.query.trim().length === 0) {
    errors.push({
      code: 'MISSING_QUERY',
      message: 'Plan must reference the original query',
      field: 'query',
    })
  }

  if (!plan.objective || plan.objective.trim().length === 0) {
    errors.push({
      code: 'MISSING_OBJECTIVE',
      message: 'Plan must have a clear objective',
      field: 'objective',
    })
  }

  if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
    errors.push({
      code: 'NO_TASKS',
      message: 'Plan must have at least one task',
      field: 'tasks',
    })
  }

  if (!plan.reasoning || plan.reasoning.trim().length === 0) {
    errors.push({
      code: 'MISSING_REASONING',
      message: 'Plan must include reasoning for the approach',
      field: 'reasoning',
    })
  }
}

/**
 * Validate individual tasks
 */
function validateTasks(tasks: PlanTask[], errors: ValidationError[], warnings: string[]): void {
  if (!Array.isArray(tasks)) return

  const taskIds = new Set<string>()
  const duplicateIds: string[] = []

  tasks.forEach((task, index) => {
    if (!task.id || task.id.trim().length === 0) {
      errors.push({
        code: 'TASK_MISSING_ID',
        message: `Task at index ${index} must have a non-empty ID`,
        field: `tasks[${index}].id`,
      })
    } else if (taskIds.has(task.id)) {
      duplicateIds.push(task.id)
    } else {
      taskIds.add(task.id)
    }

    if (!task.description || task.description.trim().length === 0) {
      errors.push({
        code: 'TASK_MISSING_DESCRIPTION',
        message: `Task \"${task.id}\" must have a description`,
        field: `tasks[${index}].description`,
      })
    }

    if (!task.expectedOutput || task.expectedOutput.trim().length === 0) {
      errors.push({
        code: 'TASK_MISSING_OUTPUT',
        message: `Task \"${task.id}\" must specify expected output`,
        field: `tasks[${index}].expectedOutput`,
      })
    }

    if (task.estimatedTokens && task.estimatedTokens < 0) {
      errors.push({
        code: 'TASK_INVALID_TOKENS',
        message: `Task \"${task.id}\" has invalid token estimate`,
        field: `tasks[${index}].estimatedTokens`,
      })
    }
  })

  if (duplicateIds.length > 0) {
    errors.push({
      code: 'DUPLICATE_TASK_IDS',
      message: `Duplicate task IDs found: ${duplicateIds.join(', ')}`,
      field: 'tasks',
    })
  }
}

/**
 * Validate task dependencies are acyclic
 */
function validateTaskDependencies(tasks: PlanTask[], errors: ValidationError[]): void {
  const taskIds = new Set(tasks.map((t) => t.id))
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(taskId: string): boolean {
    if (visited.has(taskId)) return false
    if (recursionStack.has(taskId)) return true

    visited.add(taskId)
    recursionStack.add(taskId)

    const task = tasks.find((t) => t.id === taskId)
    if (task) {
      for (const depId of task.dependsOn) {
        if (hasCycle(depId)) return true
      }
    }

    recursionStack.delete(taskId)
    return false
  }

  // Check for cycles
  for (const task of tasks) {
    if (!visited.has(task.id) && hasCycle(task.id)) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `Circular dependency detected involving task \"${task.id}\"`,
        field: 'tasks',
      })
    }
  }

  // Check for invalid dependencies
  tasks.forEach((task, index) => {
    for (const depId of task.dependsOn) {
      if (!taskIds.has(depId)) {
        errors.push({
          code: 'INVALID_DEPENDENCY',
          message: `Task \"${task.id}\" depends on non-existent task \"${depId}\"`,
          field: `tasks[${index}].dependsOn`,
        })
      }
    }
  })
}

/**
 * Validate search queries
 */
function validateSearchQueries(queries: GeneratedSearchQuery[], tasks: PlanTask[], errors: ValidationError[]): void {
  if (!Array.isArray(queries)) return

  const taskIds = new Set(tasks.map((t) => t.id))
  const queryIds = new Set<string>()
  const duplicateIds: string[] = []

  queries.forEach((query, index) => {
    if (!query.id || query.id.trim().length === 0) {
      errors.push({
        code: 'QUERY_MISSING_ID',
        message: `Search query at index ${index} must have a non-empty ID`,
        field: `searchQueries[${index}].id`,
      })
    } else if (queryIds.has(query.id)) {
      duplicateIds.push(query.id)
    } else {
      queryIds.add(query.id)
    }

    if (!query.query || !query.query.query || query.query.query.trim().length === 0) {
      errors.push({
        code: 'QUERY_MISSING_TEXT',
        message: `Search query \"${query.id}\" must have a search string`,
        field: `searchQueries[${index}].query.query`,
      })
    }

    if (!query.supportsTask || !taskIds.has(query.supportsTask)) {
      errors.push({
        code: 'QUERY_INVALID_TASK',
        message: `Search query \"${query.id}\" references non-existent task \"${query.supportsTask}\"`,
        field: `searchQueries[${index}].supportsTask`,
      })
    }
  })

  if (duplicateIds.length > 0) {
    errors.push({
      code: 'DUPLICATE_QUERY_IDS',
      message: `Duplicate search query IDs found: ${duplicateIds.join(', ')}`,
      field: 'searchQueries',
    })
  }
}

/**
 * Validate cross-references between plan sections
 */
function validateCrossReferences(plan: ExecutionPlan, errors: ValidationError[]): void {
  const taskIds = new Set(plan.tasks.map((t) => t.id))

  // Verify all search queries reference valid tasks
  plan.searchQueries.forEach((query) => {
    if (!taskIds.has(query.supportsTask)) {
      errors.push({
        code: 'INVALID_CROSS_REFERENCE',
        message: `Search query references task \"${query.supportsTask}\" that does not exist`,
      })
    }
  })
}

/**
 * Validate confidence score
 */
function validateConfidenceScore(confidence: number, errors: ValidationError[]): void {
  if (typeof confidence !== 'number') {
    errors.push({
      code: 'INVALID_CONFIDENCE_TYPE',
      message: 'Confidence score must be a number',
      field: 'confidence',
    })
  } else if (confidence < 0 || confidence > 1) {
    errors.push({
      code: 'INVALID_CONFIDENCE_RANGE',
      message: 'Confidence score must be between 0.0 and 1.0',
      field: 'confidence',
    })
  }
}
