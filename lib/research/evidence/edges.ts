import { normalizeConfidence, stableId, uniqueStrings } from './nodes'
import { EvidenceEdgeType, type EvidenceGraphEdge, type GraphMetadata } from './types'

export const FORBIDDEN_CYCLE_EDGE_TYPES: ReadonlySet<EvidenceEdgeType> = new Set([
  EvidenceEdgeType.DERIVED_FROM,
  EvidenceEdgeType.SUPPORTS,
  EvidenceEdgeType.CONTRADICTS,
])

export function createEvidenceEdge(input: {
  id?: string
  from: string
  to: string
  type: EvidenceEdgeType
  weight?: number
  confidence?: number
  metadata?: GraphMetadata
  traceIds?: readonly string[]
}): EvidenceGraphEdge {
  const from = input.from.trim()
  const to = input.to.trim()
  const identity = `${from}:${input.type}:${to}`
  return {
    id: input.id?.trim() || stableId('edge', identity),
    from,
    to,
    type: input.type,
    weight: normalizeConfidence(input.weight, 1),
    confidence: normalizeConfidence(input.confidence),
    metadata: { ...input.metadata },
    traceIds: uniqueStrings(input.traceIds ?? []),
  }
}

export function edgeIdentity(edge: EvidenceGraphEdge): string {
  return `${edge.from}:${edge.type}:${edge.to}`
}

export function mergeEdges(existing: EvidenceGraphEdge, incoming: EvidenceGraphEdge): EvidenceGraphEdge {
  if (edgeIdentity(existing) !== edgeIdentity(incoming)) throw new Error('Cannot merge edges with different identities')
  const totalWeight = existing.weight + incoming.weight
  const confidence =
    totalWeight === 0
      ? Math.max(existing.confidence, incoming.confidence)
      : (existing.confidence * existing.weight + incoming.confidence * incoming.weight) / totalWeight
  return {
    ...existing,
    weight: Math.max(existing.weight, incoming.weight),
    confidence: normalizeConfidence(confidence),
    metadata: { ...existing.metadata, ...incoming.metadata },
    traceIds: uniqueStrings([...existing.traceIds, ...incoming.traceIds]),
  }
}
