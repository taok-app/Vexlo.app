import { createLogger } from '@/lib/logging'
import type { WorkflowDefinition, WorkflowValidationResult, WorkflowStageConfig } from './types'

const logger = createLogger('[Workflow.Validator]')

export class WorkflowValidator {
  validate(workflow: WorkflowDefinition): WorkflowValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic validation
    if (!workflow.id || typeof workflow.id !== 'string') {
      errors.push('Workflow must have a valid id')
    }

    if (!workflow.name || typeof workflow.name !== 'string') {
      errors.push('Workflow must have a valid name')
    }

    if (!Array.isArray(workflow.stages) || workflow.stages.length === 0) {
      errors.push('Workflow must have at least one stage')
    }

    if (!workflow.version || typeof workflow.version !== 'string') {
      errors.push('Workflow must have a valid version')
    }

    // Validate stages
    if (Array.isArray(workflow.stages)) {
      const stageIds = new Set<string>()

      for (const stage of workflow.stages) {
        // Check for duplicate IDs
        if (stageIds.has(stage.id)) {
          errors.push(`Duplicate stage id: ${stage.id}`)
        }
        stageIds.add(stage.id)

        // Validate individual stage
        const stageErrors = this.validateStage(stage, stageIds)
        errors.push(...stageErrors)
      }

      // Check for cycles
      const cycleErrors = this.detectCycles(workflow.stages)
      errors.push(...cycleErrors)

      // Check for missing dependencies
      const depErrors = this.validateDependencies(workflow.stages, stageIds)
      errors.push(...depErrors)
    }

    // Warnings
    if (workflow.stages && workflow.stages.filter((s) => s.enabled).length === 0) {
      warnings.push('No stages are enabled in this workflow')
    }

    const valid = errors.length === 0
    if (!valid) {
      logger.error('[Workflow] Validation failed', {
        errors,
        workflowId: workflow.id,
      })
    }

    return { valid, errors, warnings }
  }

  private validateStage(stage: WorkflowStageConfig, allIds: Set<string>): string[] {
    const errors: string[] = []

    if (!stage.id || typeof stage.id !== 'string') {
      errors.push('Stage must have a valid id')
    }

    if (!stage.name || typeof stage.name !== 'string') {
      errors.push('Stage must have a valid name')
    }

    if (!stage.runtimeStage || typeof stage.runtimeStage !== 'string') {
      errors.push(`Stage ${stage.id}: must have a valid runtimeStage`)
    }

    if (!Number.isInteger(stage.timeout) || stage.timeout < 1000) {
      errors.push(`Stage ${stage.id}: timeout must be at least 1000ms`)
    }

    if (stage.retryPolicy) {
      if (!Number.isInteger(stage.retryPolicy.maxAttempts) || stage.retryPolicy.maxAttempts < 1) {
        errors.push(`Stage ${stage.id}: retryPolicy.maxAttempts must be a positive integer`)
      }
      if (!Number.isInteger(stage.retryPolicy.initialDelayMs) || stage.retryPolicy.initialDelayMs < 100) {
        errors.push(`Stage ${stage.id}: retryPolicy.initialDelayMs must be at least 100ms`)
      }
    }

    if (!Array.isArray(stage.dependencies)) {
      errors.push(`Stage ${stage.id}: dependencies must be an array`)
    }

    return errors
  }

  private validateDependencies(stages: WorkflowStageConfig[], allIds: Set<string>): string[] {
    const errors: string[] = []

    for (const stage of stages) {
      for (const dep of stage.dependencies) {
        if (!allIds.has(dep)) {
          errors.push(`Stage ${stage.id}: dependency "${dep}" does not exist`)
        }
      }
    }

    return errors
  }

  private detectCycles(stages: WorkflowStageConfig[]): string[] {
    const errors: string[] = []
    const stageMap = new Map(stages.map((s) => [s.id, s]))

    for (const stage of stages) {
      if (this.hasCycle(stage.id, stageMap, new Set())) {
        errors.push(`Cyclic dependency detected involving stage: ${stage.id}`)
      }
    }

    return errors
  }

  private hasCycle(stageId: string, stageMap: Map<string, WorkflowStageConfig>, visited: Set<string>): boolean {
    if (visited.has(stageId)) return true

    visited.add(stageId)
    const stage = stageMap.get(stageId)

    if (stage) {
      for (const dep of stage.dependencies) {
        if (this.hasCycle(dep, stageMap, new Set(visited))) {
          return true
        }
      }
    }

    return false
  }
}
