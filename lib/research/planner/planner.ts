/**
 * Planner Agent
 *
 * Takes a user query and produces a detailed execution plan.
 * Handles query analysis, intent detection, task decomposition,
 * and confidence estimation.
 */

import { generateText } from 'ai'
import { nanoid } from 'nanoid'
import { createLogger } from '@/lib/logging'
import type {
  ExecutionPlan,
  PlannerInput,
  QueryAnalysis,
  IntentType,
  TaskType,
  ReasoningStrategy,
  ConfidenceScore,
  PlanTask,
  GeneratedSearchQuery,
} from './types'
import { IntentType as IntentEnum, ReasoningStrategy as ReasoningStrategyEnum, createConfidenceScore } from './types'
import { validateExecutionPlan } from './validator'
import * as prompts from './prompts'

const logger = createLogger('research:planner')

const DEFAULT_MODEL = 'openai/gpt-4o-mini'

/**
 * Planner Agent class
 */
export class PlannerAgent {
  private model: string

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model
  }

  /**
   * Create an execution plan for a user query
   */
  async plan(input: PlannerInput): Promise<ExecutionPlan> {
    const startTime = performance.now()
    const planId = nanoid()

    logger.info('Planning query')

    try {
      // Step 1: Analyze the query
      const analysis = await this.analyzeQuery(input.query)
      logger.info('Query analyzed')

      // Step 2: Decompose into tasks
      const tasks = await this.decomposeTasks(input.query, analysis)
      logger.info('Tasks decomposed')

      // Step 3: Generate search queries
      const searchQueries = await this.generateSearchQueries(input.query, tasks)
      logger.info('Search queries generated')

      // Step 4: Select required tools
      const requiredTools = await this.selectTools(input.query, tasks, searchQueries)
      logger.info('Tools selected')

      // Step 5: Select reasoning strategy
      const strategy = await this.selectStrategy(tasks)
      logger.info('Strategy selected')

      // Step 6: Calculate confidence
      const confidence = await this.scoreConfidence(input.query, tasks, searchQueries, strategy)
      logger.info('Confidence scored')

      // Step 7: Build plan
      const plan: ExecutionPlan = {
        id: planId,
        query: input.query,
        intent: analysis.intent,
        objective: await this.generateObjective(input.query, analysis),
        tasks,
        searchQueries,
        requiredTools,
        expectedOutputs: await this.generateExpectedOutputs(input.query, analysis, tasks),
        reasoningStrategy: strategy,
        confidence,
        reasoning: await this.generateReasoning(input.query, tasks, strategy, confidence),
        estimatedTotalTokens: this.estimateTotalTokens(tasks, searchQueries),
        createdAt: new Date(),
      }

      // Step 8: Validate plan
      const validation = validateExecutionPlan(plan)
      if (!validation.valid) {
        const errorMessages = validation.errors.map((e) => `${e.code}: ${e.message}`).join('; ')
        throw new Error(`Plan validation failed: ${errorMessages}`)
      }

      const durationMs = performance.now() - startTime
      logger.info('Plan created successfully')

      return plan
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Planning failed', { error: err.message })
      throw err
    }
  }

  /**
   * Analyze the user query to understand intent and content
   */
  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    try {
      const response = await generateText({
        model: this.model,
        system: prompts.ANALYZE_QUERY_SYSTEM_PROMPT,
        prompt: query,
        temperature: 0.3,
      })

      const parsed = JSON.parse(response.text)

      return {
        intent: this.normalizeIntent(parsed.intent),
        mainTopic: parsed.mainTopic || 'unspecified',
        entities: Array.isArray(parsed.entities) ? parsed.entities : [],
        concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
        complexity: Math.max(1, Math.min(5, parseInt(parsed.complexity) || 2)),
        isActionable: parsed.isActionable !== false,
      }
    } catch (error) {
      logger.warn('Query analysis failed, using defaults', { error })
      return {
        intent: IntentEnum.INFORMATIONAL,
        mainTopic: 'unspecified',
        entities: [],
        concepts: [],
        complexity: 2,
        isActionable: true,
      }
    }
  }

  /**
   * Decompose query into actionable tasks
   */
  private async decomposeTasks(query: string, analysis: QueryAnalysis): Promise<PlanTask[]> {
    try {
      const objective = `Address query about ${analysis.mainTopic}`
      const intentStr =
        Object.keys(IntentEnum).find((k) => IntentEnum[k as keyof typeof IntentEnum] === analysis.intent) ||
        'INFORMATIONAL'

      const prompt = prompts.DECOMPOSE_TASKS_PROMPT.replace('{objective}', objective).replace('{intent}', intentStr)

      const response = await generateText({
        model: this.model,
        prompt,
        temperature: 0.5,
      })

      const parsed = JSON.parse(response.text)
      if (!Array.isArray(parsed)) return this.getDefaultTasks(analysis)

      return parsed.map((task: Record<string, unknown>, idx: number) => ({
        id: `task_${idx}_${nanoid(8)}`,
        type: this.normalizeTaskType(task.type as string),
        description: String(task.description || ''),
        priority: this.normalizePriority(task.priority as string),
        dependsOn: Array.isArray(task.dependsOn) ? task.dependsOn : [],
        expectedOutput: String(task.expectedOutput || ''),
      }))
    } catch (error) {
      logger.warn('Task decomposition failed, using defaults', { error })
      return this.getDefaultTasks(analysis)
    }
  }

  /**
   * Generate search queries for research tasks
   */
  private async generateSearchQueries(query: string, tasks: PlanTask[]): Promise<GeneratedSearchQuery[]> {
    try {
      const taskSummary = tasks
        .map((t) => `- ${t.id}: ${t.description}`)
        .join(
          '\
',
        )

      const prompt = prompts.GENERATE_SEARCH_QUERIES_PROMPT.replace('{objective}', query).replace(
        '{tasks}',
        taskSummary,
      )

      const response = await generateText({
        model: this.model,
        prompt,
        temperature: 0.5,
      })

      const parsed = JSON.parse(response.text)
      if (!Array.isArray(parsed)) return []

      return parsed.map((sq: Record<string, unknown>) => ({
        id: `search_${nanoid(8)}`,
        query: {
          query: String(sq.query || ''),
          limit: 10,
        },
        rationale: String(sq.rationale || ''),
        supportsTask: String(sq.taskId || tasks[0]?.id || ''),
        priority: this.normalizePriority(sq.priority as string),
      }))
    } catch (error) {
      logger.warn('Search query generation failed', { error })
      return []
    }
  }

  /**
   * Select required tools
   */
  private async selectTools(
    query: string,
    tasks: PlanTask[],
    searchQueries: GeneratedSearchQuery[],
  ): Promise<Record<string, unknown>> {
    try {
      const taskSummary = tasks.map((t) => t.type).join(', ')
      const prompt = prompts.SELECT_TOOLS_PROMPT.replace('{objective}', query)
        .replace('{tasks}', taskSummary)
        .replace('{searchQueryCount}', String(searchQueries.length))

      const response = await generateText({
        model: this.model,
        prompt,
        temperature: 0.3,
      })

      const parsed = JSON.parse(response.text)

      return {
        searchProviders: parsed.search ? ['tavily', 'exa'] : [],
        browserNeeded: parsed.browser === true,
        reasoningNeeded: parsed.reasoning === true,
        critiqueNeeded: parsed.critique === true,
      }
    } catch (error) {
      logger.warn('Tool selection failed, using defaults', { error })
      return {
        searchProviders: searchQueries.length > 0 ? ['tavily'] : [],
        browserNeeded: false,
        reasoningNeeded: true,
        critiqueNeeded: false,
      }
    }
  }

  /**
   * Select execution strategy
   */
  private async selectStrategy(tasks: PlanTask[]): Promise<ReasoningStrategy> {
    try {
      const taskSummary = tasks.map((t) => `${t.id} (depends on: ${t.dependsOn.join(', ') || 'none'})`).join('; ')

      const prompt = prompts.SELECT_STRATEGY_PROMPT.replace('{tasks}', taskSummary)

      const response = await generateText({
        model: this.model,
        prompt,
        temperature: 0.3,
      })

      const strategy = response.text.toUpperCase().trim()

      if (Object.values(ReasoningStrategyEnum).includes(strategy as ReasoningStrategy)) {
        return strategy as ReasoningStrategy
      }

      return ReasoningStrategyEnum.ADAPTIVE
    } catch (error) {
      logger.warn('Strategy selection failed, using ADAPTIVE', { error })
      return ReasoningStrategyEnum.ADAPTIVE
    }
  }

  /**
   * Score confidence in the plan
   */
  private async scoreConfidence(
    query: string,
    tasks: PlanTask[],
    searchQueries: GeneratedSearchQuery[],
    strategy: ReasoningStrategy,
  ): Promise<ConfidenceScore> {
    try {
      const prompt = prompts.SCORE_CONFIDENCE_PROMPT.replace('{objective}', query)
        .replace('{taskCount}', String(tasks.length))
        .replace('{searchCount}', String(searchQueries.length))
        .replace('{strategy}', strategy)

      const response = await generateText({
        model: this.model,
        prompt,
        temperature: 0.2,
      })

      const scoreStr = response.text.trim()
      const score = parseFloat(scoreStr) || 0.7

      return createConfidenceScore(score)
    } catch (error) {
      logger.warn('Confidence scoring failed, using default', { error })
      return createConfidenceScore(0.6)
    }
  }

  /**
   * Generate objective statement
   */
  private async generateObjective(query: string, analysis: QueryAnalysis): Promise<string> {
    return `Address query about \"${analysis.mainTopic}\": ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`
  }

  /**
   * Generate expected outputs
   */
  private async generateExpectedOutputs(query: string, analysis: QueryAnalysis, tasks: PlanTask[]): Promise<string[]> {
    return [
      `Comprehensive answer to: \"${query.substring(0, 80)}...\"`,
      `${tasks.length} research tasks completed`,
      'Key findings synthesized',
      'Sources cited',
    ]
  }

  /**
   * Generate reasoning explanation
   */
  private async generateReasoning(
    query: string,
    tasks: PlanTask[],
    strategy: ReasoningStrategy,
    confidence: ConfidenceScore,
  ): Promise<string> {
    return (
      `Plan uses ${strategy} strategy with ${tasks.length} tasks to address the query. ` +
      `Confidence: ${Math.round(Number(confidence) * 100)}%. ` +
      `Tasks are ordered to maximize parallelism while respecting dependencies.`
    )
  }

  /**
   * Estimate total tokens needed
   */
  private estimateTotalTokens(tasks: PlanTask[], searchQueries: GeneratedSearchQuery[]): number {
    let total = 0

    // Task tokens
    tasks.forEach((t) => {
      total += t.estimatedTokens || 500
    })

    // Search query tokens (estimate 200 per search)
    total += searchQueries.length * 200

    // Add overhead for orchestration
    total += 500

    return total
  }

  /**
   * Normalize intent from string
   */
  private normalizeIntent(intent: string): IntentType {
    const normalized = String(intent || '').toUpperCase()
    if (Object.values(IntentEnum).includes(normalized as IntentType)) {
      return normalized as IntentType
    }
    return IntentEnum.INFORMATIONAL
  }

  /**
   * Normalize task type from string
   */
  private normalizeTaskType(type: string): TaskType {
    const normalized = String(type || '').toUpperCase()
    // Return as-is if valid, otherwise default to SEARCH
    return (normalized as TaskType) || 'search'
  }

  /**
   * Normalize priority from string
   */
  private normalizePriority(priority: string): 'normal' {
    // For now, return normal priority
    // Can be expanded to support different priorities
    return 'normal'
  }

  /**
   * Get default tasks based on analysis
   */
  private getDefaultTasks(analysis: QueryAnalysis): PlanTask[] {
    return [
      {
        id: `task_search_${nanoid(8)}`,
        type: 'search' as TaskType,
        description: `Search for information about \"${analysis.mainTopic}\"`,
        priority: 'high' as const,
        dependsOn: [],
        expectedOutput: `Search results and relevant sources about ${analysis.mainTopic}`,
        estimatedTokens: 500,
      },
      {
        id: `task_synthesize_${nanoid(8)}`,
        type: 'synthesize' as TaskType,
        description: 'Synthesize findings into coherent answer',
        priority: 'high' as const,
        dependsOn: [`task_search_${nanoid(8)}`],
        expectedOutput: 'Comprehensive answer addressing the query',
        estimatedTokens: 1000,
      },
    ]
  }
}

/**
 * Create a planner agent with default settings
 */
export function createPlannerAgent(model?: string): PlannerAgent {
  return new PlannerAgent(model)
}
