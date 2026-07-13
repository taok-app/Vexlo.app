import { createLogger } from '@/lib/logging'
import { PlannerAgent } from '@/lib/research/planner/planner'

const logger = createLogger('[ResearchRuntime]')
import { ResearchSearchAgent } from '@/lib/research/search/search-agent'
import { ResearchBrowserAgent } from '@/lib/research/browser/browser-agent'
import { EvidenceGraph } from '@/lib/research/evidence/graph'
import { EvidenceGraphBuilder } from '@/lib/research/evidence/builder'
import type { PlannerInput, ExecutionPlan } from '@/lib/research/planner/types'
import type { SearchTask, SearchGenerationResult } from '@/lib/research/search/types'
import type { BrowserRunResult } from '@/lib/research/browser/types'
import type { RuntimeOutput, RuntimeOptions, RuntimeDependencies, RuntimeCheckpoint, PlannerResult, ReasoningAdapter } from './types'
import type { ReasoningResultLike } from '@/lib/research/evidence/types'
import { RuntimeStage, RuntimeEventType } from './types'
import {
  SimpleEventEmitter,
  createStageStartEvent,
  createStageCompleteEvent,
  createStageErrorEvent,
  createProgressEvent,
} from './events'
import { executeWithRetry, DEFAULT_RETRY_POLICY } from './retry'
import { BoundedScheduler } from './scheduler'
import { validatePlannerInput, validateRuntimeOptions, validateDependencies, logValidationErrors } from './validator'
import type { WorkflowContext } from '@/lib/research/workflow/types'
import type { RuntimeWorkflowIntegration } from './integration'
import { createRuntimeContext, recordMetric, recordFailure } from '@/lib/research/middleware/context'

export class ResearchRuntime {
  private stage: RuntimeStage = RuntimeStage.IDLE
  private startTime = 0
  private stageTimings = new Map<RuntimeStage, number>()
  private emitter = new SimpleEventEmitter()
  private abortController = new AbortController()
  private scheduler: BoundedScheduler
  private checkpoint: RuntimeCheckpoint | null = null
  private planner: PlannerAgent
  private search: ResearchSearchAgent
  private browser: ResearchBrowserAgent
  private options: RuntimeOptions
  private deps: RuntimeDependencies
  private workflowIntegration: RuntimeWorkflowIntegration | null = null
  private middlewareFunctions: {
    createRuntimeContext: typeof createRuntimeContext
    recordMetric: typeof recordMetric
    recordFailure: typeof recordFailure
  } | null = null

  constructor(options: RuntimeOptions = {}, deps: RuntimeDependencies = {}) {
    const optionsValidation = validateRuntimeOptions(options)
    if (!optionsValidation.valid) {
      logValidationErrors('RuntimeOptions', optionsValidation)
      throw new Error(`Invalid runtime options: ${optionsValidation.errors.join('; ')}`)
    }

    const depsValidation = validateDependencies(deps)
    if (!depsValidation.valid) {
      logValidationErrors('RuntimeDependencies', depsValidation)
      throw new Error(`Invalid runtime dependencies: ${depsValidation.errors.join('; ')}`)
    }

    this.options = {
      maxConcurrentBrowserRequests: 5,
      planTimeout: 60000,
      searchTimeout: 120000,
      browserTimeout: 300000,
      retryPolicy: DEFAULT_RETRY_POLICY,
      failFast: true,
      ...options,
    }

    this.deps = deps

    this.scheduler = new BoundedScheduler(this.options.maxConcurrentBrowserRequests)
    this.planner = new PlannerAgent()
    this.search = new ResearchSearchAgent()
    this.browser = new ResearchBrowserAgent()

    // Initialize workflow integration lazily to avoid initialization errors
    this.workflowIntegration = null
  }

  async run(input: PlannerInput, checkpoint?: RuntimeCheckpoint): Promise<RuntimeOutput> {
    const inputValidation = validatePlannerInput(input)
    if (!inputValidation.valid) {
      logValidationErrors('PlannerInput', inputValidation)
      throw new Error(`Invalid planner input: ${inputValidation.errors.join('; ')}`)
    }

    this.startTime = Date.now()
    this.stage = RuntimeStage.PLANNING
    this.checkpoint = checkpoint ?? null
    this.abortController = new AbortController()

    const graph = new EvidenceGraph()
    const builder = new EvidenceGraphBuilder({ ...graph.snapshot() })
    const timings: Record<RuntimeStage, number> = {} as Record<RuntimeStage, number>
    const stageResults: Record<string, unknown> = {}

    // Lazy initialize workflow integration
    if (!this.workflowIntegration) {
      try {
        // Dynamic imports to avoid circular dependency issues
        const { RuntimeWorkflowIntegration } = await import('./integration')
        const { WorkflowPresets } = await import('@/lib/research/workflow/presets')
        const { getBuiltinMiddleware } = await import('@/lib/research/middleware/builtins')

        this.middlewareFunctions = {
          createRuntimeContext,
          recordMetric,
          recordFailure,
        }

        const workflow = WorkflowPresets.standardResearch()
        const loggingMiddleware = getBuiltinMiddleware('logging')
        const timingMiddleware = getBuiltinMiddleware('timing')
        const retryMiddleware = getBuiltinMiddleware('retry')
        const builtinMiddleware = [loggingMiddleware, timingMiddleware, retryMiddleware].filter(
          (m) => m !== undefined,
        ) as any[]
        const { DefaultStageRegistry } = await import('@/lib/research/workflow/registry')
        this.workflowIntegration = new RuntimeWorkflowIntegration(workflow, new DefaultStageRegistry(), builtinMiddleware)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error('[Runtime] Failed to initialize workflow integration', { error: err.message })
        throw err
      }
    }

    try {
      // Get workflow execution order
      const workflowContext: WorkflowContext = {
        stageResults,
        input,
        timestamp: this.startTime,
      }
      const executionOrder = this.workflowIntegration.getExecutionOrder(workflowContext)

      // Execute each stage through workflow + middleware
      for (const stageId of executionOrder) {
        const runtimeStage = stageId as RuntimeStage
        this.stage = runtimeStage

        // Create runtime context for middleware
        const middlewareContext = this.middlewareFunctions!.createRuntimeContext(
          `exec-${this.startTime}`,
          'research-workflow',
          runtimeStage,
          this.emitter,
          this.abortController.signal,
        )

        // Emit stage start event
        this.emitter.emit(createStageStartEvent(runtimeStage))

        const stageStart = Date.now()

        try {
          // Execute stage through middleware pipeline
          const stageExecutor = () => this.executeStageLogic(runtimeStage, input, stageResults)
          const result = await this.workflowIntegration.executeStage(stageId, middlewareContext, stageExecutor)

          stageResults[stageId] = result
          timings[runtimeStage] = Date.now() - stageStart

          // Record metrics
          this.middlewareFunctions!.recordMetric(middlewareContext, stageId, timings[runtimeStage])

          this.emitter.emit(createStageCompleteEvent(runtimeStage, result))
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error))
          timings[runtimeStage] = Date.now() - stageStart
          this.middlewareFunctions!.recordFailure(middlewareContext, stageId)
          this.emitter.emit(createStageErrorEvent(runtimeStage, err))

          if (this.options.failFast ?? true) {
            throw err
          }
          logger.warn(`Stage ${stageId} failed but continuing`, { error: err.message })
        }
      }

      // Build final output
      const plannerResult = stageResults[RuntimeStage.PLANNING] as ExecutionPlan | undefined
      const searchGenResult = stageResults[RuntimeStage.SEARCHING] as SearchGenerationResult | undefined
      const searchResults: SearchTask[] = searchGenResult?.tasks ?? []
      const browserRunResult = stageResults[RuntimeStage.BROWSING] as BrowserRunResult | undefined
      const browserResults = browserRunResult?.sources ?? []
      const reasoningResult = stageResults[RuntimeStage.REASONING] as ReasoningResultLike | undefined

      if (reasoningResult) {
        builder.addReasoningResult(reasoningResult)
      }
      if (browserResults) {
        for (const source of browserResults) {
          builder.addSource(source)
        }
      }

      // Complete
      this.stage = RuntimeStage.COMPLETE
      const totalTime = Date.now() - this.startTime

      const output: RuntimeOutput = {
        graph: graph.snapshot(),
        stages: {
          planner: plannerResult
            ? { plan: plannerResult, confidence: Number(plannerResult.confidence), taskCount: plannerResult.tasks.length }
            : { plan: null, confidence: 0, taskCount: 0 },
          search: searchResults,
          browser: browserResults,
          reasoning: reasoningResult,
        },
        timing: {
          total: totalTime,
          planning: timings[RuntimeStage.PLANNING] || 0,
          searching: timings[RuntimeStage.SEARCHING] || 0,
          browsing: timings[RuntimeStage.BROWSING] || 0,
          reasoning: timings[RuntimeStage.REASONING],
          graphBuilding: timings[RuntimeStage.GRAPH_BUILDING] || 0,
        },
        checkpoints: this.checkpoint ? [this.checkpoint] : [],
      }

      logger.info('[Runtime] Research execution completed', {
        totalTime,
        stageTiming: Object.fromEntries(Object.entries(timings)),
      })

      return output
    } catch (error) {
      this.stage = RuntimeStage.FAILED
      const err = error instanceof Error ? error : new Error(String(error))
      this.emitter.emit(createStageErrorEvent(this.stage, err))
      logger.error('[Runtime] Research execution failed', { error: err.message })
      throw err
    }
  }

  private async executeStageLogic(
    stage: RuntimeStage,
    input: PlannerInput,
    results: Record<string, unknown>,
  ): Promise<unknown> {
    switch (stage) {
      case RuntimeStage.PLANNING:
        return this.planner.plan(input)

      case RuntimeStage.SEARCHING: {
        const planResult = results[RuntimeStage.PLANNING] as ExecutionPlan
        return this.search.generate(planResult, { expansion: { maxVariantsPerQuery: 3 } })
      }

      case RuntimeStage.BROWSING: {
        const searchGenResult = results[RuntimeStage.SEARCHING] as SearchGenerationResult
        const searchTasks = searchGenResult?.tasks ?? []
        return this.browser.execute(searchTasks, {
          concurrency: this.options.maxConcurrentBrowserRequests || 5,
          timeoutMs: this.options.browserTimeout || 300000,
        })
      }

      case RuntimeStage.REASONING: {
        if (!this.deps.reasoningAdapter) {
          return undefined
        }
        const searchGenResult = results[RuntimeStage.SEARCHING] as SearchGenerationResult
        const searchResults: SearchTask[] = searchGenResult?.tasks ?? []
        const browserRunResult = results[RuntimeStage.BROWSING] as BrowserRunResult
        const browserResults = browserRunResult?.sources ?? []
        return this.deps.reasoningAdapter.reason(searchResults, browserResults)
      }

      case RuntimeStage.GRAPH_BUILDING:
        return results[RuntimeStage.GRAPH_BUILDING] || null

      default:
        throw new Error(`Unknown stage: ${stage}`)
    }
  }

  cancel(): void {
    this.stage = RuntimeStage.CANCELLED
    this.abortController.abort()
    this.scheduler.cancel()
    this.emitter.emit({
      type: RuntimeEventType.CANCELLED,
      timestamp: Date.now(),
      stage: RuntimeStage.CANCELLED,
      data: null,
    })
    logger.info('[Runtime] Research execution cancelled')
  }

  on(event: RuntimeEventType, handler: (data: unknown) => void): void {
    this.emitter.on(event, (evt) => handler(evt.data))
  }

  off(event: RuntimeEventType, handler: (data: unknown) => void): void {
    this.emitter.off(event, (evt) => handler(evt.data))
  }

  getStage(): RuntimeStage {
    return this.stage
  }
}
