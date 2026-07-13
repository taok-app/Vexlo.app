import type { PlannerInput } from '@/lib/research/planner/types'
import type { SearchTask } from '@/lib/research/search/types'
import type { RetrievedSource } from '@/lib/research/browser/types'
import type { EvidenceGraphSnapshot, ReasoningResultLike } from '@/lib/research/evidence/types'

export enum RuntimeStage {
  IDLE = 'idle',
  PLANNING = 'planning',
  SEARCHING = 'searching',
  BROWSING = 'browsing',
  REASONING = 'reasoning',
  GRAPH_BUILDING = 'graph_building',
  COMPLETE = 'complete',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RuntimeEventType {
  STAGE_START = 'stage_start',
  STAGE_COMPLETE = 'stage_complete',
  STAGE_ERROR = 'stage_error',
  PROGRESS = 'progress',
  CHECKPOINT = 'checkpoint',
  CANCELLED = 'cancelled',
}

export interface RuntimeOptions {
  maxConcurrentBrowserRequests?: number
  planTimeout?: number
  searchTimeout?: number
  browserTimeout?: number
  reasoningTimeout?: number
  retryPolicy?: RetryPolicy
  failFast?: boolean
  checkpointInterval?: number
}

export interface RetryPolicy {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

export interface RuntimeCheckpoint {
  stage: RuntimeStage
  timestamp: number
  planResult?: PlannerResult
  searchResults?: GeneratedSearchQuery[]
  browserResults?: RetrievedSource[]
  reasoningResult?: ReasoningResultLike
}

export interface RuntimeProgress {
  stage: RuntimeStage
  percentComplete: number
  tasksCompleted: number
  tasksTotal: number
  currentOperation?: string
}

export interface PlannerResult {
  plan: unknown
  confidence: number
  taskCount: number
}

export interface RuntimeOutput {
  graph: EvidenceGraphSnapshot
  stages: {
    planner: PlannerResult
    search: SearchTask[]
    browser: RetrievedSource[]
    reasoning?: ReasoningResultLike
  }
  timing: {
    total: number
    planning: number
    searching: number
    browsing: number
    reasoning?: number
    graphBuilding: number
  }
  checkpoints: RuntimeCheckpoint[]
}

export interface ReasoningAdapter {
  reason(queries: SearchTask[], sources: RetrievedSource[]): Promise<ReasoningResultLike>
}

export interface RuntimeDependencies {
  reasoningAdapter?: ReasoningAdapter
}

export interface RuntimeState {
  stage: RuntimeStage
  startTime: number
  checkpoint?: RuntimeCheckpoint
  abortController: AbortController
}
