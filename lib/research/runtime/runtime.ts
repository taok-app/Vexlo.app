import { createLogger } from '@/lib/logging'
import { PlannerAgent } from '@/lib/research/planner/planner'

const logger = createLogger('[ResearchRuntime]')
import { SearchAgent } from '@/lib/research/search/search-agent'
import { BrowserAgent } from '@/lib/research/browser/browser-agent'
import { EvidenceGraph } from '@/lib/research/evidence/graph'
import { EvidenceGraphBuilder } from '@/lib/research/evidence/builder'
import type { PlannerInput } from '@/lib/research/planner/types'
import type { SearchTask } from '@/lib/research/search/types'
import type { RuntimeOutput, RuntimeOptions, RuntimeDependencies, RuntimeCheckpoint, PlannerResult } from './types'
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

export class ResearchRuntime {
  private stage: RuntimeStage = RuntimeStage.IDLE
  private startTime = 0
  private stageTimings = new Map<RuntimeStage, number>()
  private emitter = new SimpleEventEmitter()
  private abortController = new AbortController()
  private scheduler: BoundedScheduler
  private checkpoint: RuntimeCheckpoint | null = null
  private planner: PlannerAgent
  private search: SearchAgent
  private browser: BrowserAgent
  private options: RuntimeOptions
  private deps: RuntimeDependencies

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
    this.search = new SearchAgent()
    this.browser = new BrowserAgent()
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

    try {
      // Stage 1: Planning
      const planStart = Date.now()
      this.emitter.emit(createStageStartEvent(RuntimeStage.PLANNING))

      const planResult = await executeWithRetry(
        () => this.planner.plan(input),
        'Planner',
        this.options.retryPolicy,
        this.abortController.signal,
      )
      const plannerResult: PlannerResult = {
        plan: planResult,
        confidence: 0.8,
        taskCount: (planResult as unknown as { tasks?: unknown[] }).tasks?.length || 0,
      }
      timings[RuntimeStage.PLANNING] = Date.now() - planStart
      this.emitter.emit(createStageCompleteEvent(RuntimeStage.PLANNING, plannerResult))

      // Stage 2: Searching
      this.stage = RuntimeStage.SEARCHING
      const searchStart = Date.now()
      this.emitter.emit(createStageStartEvent(RuntimeStage.SEARCHING))

      const searchResults = (await executeWithRetry(
        () => this.search.search(planResult, { maxExpansions: 3 }),
        'Search',
        this.options.retryPolicy,
        this.abortController.signal,
      )) as SearchTask[]
      timings[RuntimeStage.SEARCHING] = Date.now() - searchStart
      this.emitter.emit(createStageCompleteEvent(RuntimeStage.SEARCHING, searchResults))

      // Stage 3: Browsing
      this.stage = RuntimeStage.BROWSING
      const browserStart = Date.now()
      this.emitter.emit(createStageStartEvent(RuntimeStage.BROWSING))

      const browserResults = await this.browser.retrieve(searchResults, {
        maxConcurrent: this.options.maxConcurrentBrowserRequests || 5,
        timeout: this.options.browserTimeout || 300000,
        failFast: this.options.failFast ?? true,
      })
      timings[RuntimeStage.BROWSING] = Date.now() - browserStart
      this.emitter.emit(createStageCompleteEvent(RuntimeStage.BROWSING, browserResults))

      // Stage 4: Reasoning (if adapter available)
      let reasoningResult = undefined
      if (this.deps.reasoningAdapter) {
        this.stage = RuntimeStage.REASONING
        const reasoningStart = Date.now()
        this.emitter.emit(createStageStartEvent(RuntimeStage.REASONING))

        reasoningResult = await executeWithRetry(
          () => this.deps.reasoningAdapter!.reason(searchResults, browserResults),
          'Reasoning',
          this.options.retryPolicy,
          this.abortController.signal,
        )
        timings[RuntimeStage.REASONING] = Date.now() - reasoningStart
        this.emitter.emit(createStageCompleteEvent(RuntimeStage.REASONING, reasoningResult))
      }

      // Stage 5: Graph Building
      this.stage = RuntimeStage.GRAPH_BUILDING
      const graphStart = Date.now()
      this.emitter.emit(createStageStartEvent(RuntimeStage.GRAPH_BUILDING))

      if (reasoningResult) {
        builder.addReasoningResult(reasoningResult)
      }
      for (const source of browserResults) {
        builder.addSource(source)
      }

      const graphSnapshot = graph.snapshot()
      timings[RuntimeStage.GRAPH_BUILDING] = Date.now() - graphStart
      this.emitter.emit(createStageCompleteEvent(RuntimeStage.GRAPH_BUILDING, graphSnapshot))

      // Complete
      this.stage = RuntimeStage.COMPLETE
      const totalTime = Date.now() - this.startTime

      const output: RuntimeOutput = {
        graph: graphSnapshot,
        stages: {
          planner: plannerResult,
          search: searchResults,
          browser: browserResults,
          reasoning: reasoningResult,
        },
        timing: {
          total: totalTime,
          planning: timings[RuntimeStage.PLANNING],
          searching: timings[RuntimeStage.SEARCHING],
          browsing: timings[RuntimeStage.BROWSING],
          reasoning: timings[RuntimeStage.REASONING],
          graphBuilding: timings[RuntimeStage.GRAPH_BUILDING],
        },
        checkpoints: this.checkpoint ? [this.checkpoint] : [],
      }

      logger.info('[Runtime] Research execution completed', {
        totalTime,
        stageTiming: Object.fromEntries(timings),
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
