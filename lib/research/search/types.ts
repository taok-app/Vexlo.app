import type { ConfidenceScore, ExecutionPlan, IntentType, PlanTask, TaskPriority } from '@/lib/research/planner/types'

export type { ConfidenceScore, ExecutionPlan, IntentType, PlanTask, TaskPriority }

export enum SearchDepth {
  QUICK = 'quick',
  STANDARD = 'standard',
  DEEP = 'deep',
}

export enum SearchIntent {
  DEFINITION = 'definition',
  EXPLANATION = 'explanation',
  COMPARISON = 'comparison',
  HOW_TO = 'how_to',
  EVIDENCE = 'evidence',
  DISCOVERY = 'discovery',
}

export type ExpansionCategory = 'synonym' | 'abbreviation' | 'alias' | 'related' | 'broader' | 'narrower'

export interface QueryVariant {
  query: string
  kind: 'original' | 'natural' | 'quoted' | 'boolean' | 'expanded' | 'ai'
  sourceTaskId?: string
  language?: string
  expansionCategories?: ExpansionCategory[]
}

export interface SearchTask {
  id: string
  planTaskId?: string
  query: string
  intent: SearchIntent
  priority: TaskPriority
  confidence: number
  expectedUsefulness: number
  language?: string
  sourceTypes: string[]
  rationale: string
}

export interface SearchStrategy {
  depth: SearchDepth
  maxSearches: number
  parallelism: number
  expectedDepth: number
  preferredSourceTypes: string[]
  rationale: string
}

export interface ExpansionOptions {
  enabled?: boolean
  categories?: ExpansionCategory[]
  maxVariantsPerQuery?: number
}

export interface SearchGenerationOptions {
  depth?: SearchDepth
  maxSearches?: number
  aiTimeoutMs?: number
  expansion?: ExpansionOptions
}

export interface SearchGenerationMetadata {
  strategy: SearchStrategy
  generatedCount: number
  deduplicatedCount: number
  aggregateConfidence: number
  durationMs: number
  warnings: string[]
}

export interface SearchGenerationResult {
  planId: string
  tasks: SearchTask[]
  metadata: SearchGenerationMetadata
}

export interface AIQuerySuggestion {
  query: string
  intent?: SearchIntent
  sourceTaskId?: string
  rationale?: string
  confidence?: number
}

export interface SearchAIAdapter {
  optimizeQueries(input: {
    objective: string
    intent: IntentType
    strategy: SearchStrategy
    candidates: QueryVariant[]
  }): Promise<AIQuerySuggestion[]>
}

export interface KnowledgeExpansionAdapter {
  expandQuery(input: {
    query: string
    categories: ExpansionCategory[]
    limit: number
    language?: string
  }): Promise<Array<{ term: string; category: ExpansionCategory }>>
}

export interface SearchAgentDependencies {
  ai?: SearchAIAdapter
  knowledge?: KnowledgeExpansionAdapter
}

export interface SearchValidationError {
  code: string
  message: string
  field?: string
  taskId?: string
}

export interface SearchValidationResult {
  valid: boolean
  errors: SearchValidationError[]
  warnings: string[]
}

export enum SearchAgentErrorCode {
  INVALID_PLAN = 'INVALID_PLAN',
  NO_VALID_QUERIES = 'NO_VALID_QUERIES',
}

export class SearchAgentError extends Error {
  constructor(
    public readonly code: SearchAgentErrorCode,
    message: string,
    public readonly validation?: SearchValidationResult,
  ) {
    super(message)
    this.name = 'SearchAgentError'
  }
}
