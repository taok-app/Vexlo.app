import {
  EVIDENCE_GRAPH_VERSION,
  type EvidenceGraphSnapshot,
  type GraphMetadata,
  type StructuredGraphExport,
} from './types'

export function structuredExport(snapshot: EvidenceGraphSnapshot): StructuredGraphExport {
  const nodes = [...snapshot.nodes].sort((left, right) => left.id.localeCompare(right.id)).map(stableNode)
  const edges = [...snapshot.edges]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((edge) => ({ ...edge, metadata: stableRecord(edge.metadata), traceIds: [...edge.traceIds].sort() }))
  return {
    version: snapshot.version || EVIDENCE_GRAPH_VERSION,
    nodes,
    edges,
    metadata: stableRecord(snapshot.metadata),
    nodeCount: nodes.length,
    edgeCount: edges.length,
  }
}

export function serializeEvidenceGraph(snapshot: EvidenceGraphSnapshot, space = 0): string {
  return JSON.stringify(structuredExport(snapshot), null, space)
}

export function deserializeEvidenceGraph(serialized: string): EvidenceGraphSnapshot {
  const value: unknown = JSON.parse(serialized)
  if (
    !isRecord(value) ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    typeof value.version !== 'string'
  ) {
    throw new Error('Invalid evidence graph serialization')
  }
  return {
    version: value.version,
    nodes: value.nodes as EvidenceGraphSnapshot['nodes'],
    edges: value.edges as EvidenceGraphSnapshot['edges'],
    metadata: isRecord(value.metadata) ? (value.metadata as EvidenceGraphSnapshot['metadata']) : {},
  }
}

function stableNode<T extends EvidenceGraphSnapshot['nodes'][number]>(node: T): T {
  const copy = { ...node, metadata: stableRecord(node.metadata), traceIds: [...node.traceIds].sort() }
  if ('aliases' in copy) return { ...copy, aliases: [...copy.aliases].sort() }
  return copy
}

function stableRecord(record: GraphMetadata): GraphMetadata {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
