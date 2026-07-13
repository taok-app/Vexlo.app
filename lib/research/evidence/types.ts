import type { RetrievedSource } from '@/lib/research/browser'

export const EVIDENCE_GRAPH_VERSION = '1.0.0' as const

export enum EvidenceNodeType {
  CLAIM = 'claim',
  EVIDENCE = 'evidence',
  ENTITY = 'entity',
  SOURCE = 'source',
  RELATIONSHIP = 'relationship',
}

export enum EvidenceEdgeType {
  SUPPORTS = 'supports',
  CONTRADICTS = 'contradicts',
  MENTIONS = 'mentions',
  REFERENCES = 'references',
  DERIVED_FROM = 'derived_from',
  RELATED_TO = 'related_to',
}

export type GraphMetadataValue = string | number | boolean | null | string[]
export type GraphMetadata = Readonly<Record<string, GraphMetadataValue>>

export interface EvidenceNodeBase {
  id: string
  type: EvidenceNodeType
  metadata: GraphMetadata
  confidence: number
  traceIds: readonly string[]
}

export interface ClaimNode extends EvidenceNodeBase {
  type: EvidenceNodeType.CLAIM
  statement: string
}

export interface EvidenceNode extends EvidenceNodeBase {
  type: EvidenceNodeType.EVIDENCE
  content: string
  sourceId?: string
}

export interface EntityNode extends EvidenceNodeBase {
  type: EvidenceNodeType.ENTITY
  name: string
  entityType?: string
  aliases: readonly string[]
}

export interface SourceNode extends EvidenceNodeBase {
  type: EvidenceNodeType.SOURCE
  title: string
  url: string
  author?: string
  publishedAt?: string
}

export interface RelationshipNode extends EvidenceNodeBase {
  type: EvidenceNodeType.RELATIONSHIP
  label: string
  subjectId: string
  objectId: string
}

export type EvidenceGraphNode = ClaimNode | EvidenceNode | EntityNode | SourceNode | RelationshipNode

export interface EvidenceGraphEdge {
  id: string
  from: string
  to: string
  type: EvidenceEdgeType
  weight: number
  confidence: number
  metadata: GraphMetadata
  traceIds: readonly string[]
}

export interface EvidenceGraphSnapshot {
  version: string
  nodes: readonly EvidenceGraphNode[]
  edges: readonly EvidenceGraphEdge[]
  metadata: GraphMetadata
}

export interface StructuredGraphExport extends EvidenceGraphSnapshot {
  nodeCount: number
  edgeCount: number
}

export interface GraphValidationIssue {
  code: string
  message: string
  path?: string
  id?: string
}

export interface GraphValidationResult {
  valid: boolean
  errors: readonly GraphValidationIssue[]
  warnings: readonly GraphValidationIssue[]
}

export interface GraphMergeResult {
  addedNodes: number
  mergedNodes: number
  addedEdges: number
  mergedEdges: number
  durationMs: number
}

export interface ReasoningClaimInput {
  id?: string
  statement: string
  confidence?: number
  evidenceIds?: readonly string[]
  contradictingEvidenceIds?: readonly string[]
  entityIds?: readonly string[]
  metadata?: GraphMetadata
  traceIds?: readonly string[]
}

export interface ReasoningEvidenceInput {
  id?: string
  content: string
  confidence?: number
  sourceId?: string
  metadata?: GraphMetadata
  traceIds?: readonly string[]
}

export interface ReasoningEntityInput {
  id?: string
  name: string
  entityType?: string
  aliases?: readonly string[]
  confidence?: number
  metadata?: GraphMetadata
  traceIds?: readonly string[]
}

export interface ReasoningRelationshipInput {
  id?: string
  label: string
  subjectId: string
  objectId: string
  confidence?: number
  metadata?: GraphMetadata
  traceIds?: readonly string[]
}

/** Structural boundary for the future Reasoning Agent result contract. */
export interface ReasoningResultLike {
  id?: string
  claims: readonly ReasoningClaimInput[]
  evidence?: readonly ReasoningEvidenceInput[]
  entities?: readonly ReasoningEntityInput[]
  relationships?: readonly ReasoningRelationshipInput[]
  sources?: readonly RetrievedSource[]
  metadata?: GraphMetadata
}

export interface GraphTraversalOptions {
  edgeTypes?: readonly EvidenceEdgeType[]
  direction?: 'incoming' | 'outgoing' | 'both'
  maxDepth?: number
}

export interface ConfidencePropagationOptions {
  damping?: number
  iterations?: number
}

export type { RetrievedSource }
