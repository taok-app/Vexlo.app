import { FORBIDDEN_CYCLE_EDGE_TYPES } from './edges'
import {
  EvidenceNodeType,
  type EvidenceGraphEdge,
  type EvidenceGraphNode,
  type EvidenceGraphSnapshot,
  type GraphValidationIssue,
  type GraphValidationResult,
} from './types'

export function validateEvidenceGraph(snapshot: EvidenceGraphSnapshot): GraphValidationResult {
  const errors: GraphValidationIssue[] = []
  const warnings: GraphValidationIssue[] = []
  const nodeIds = collectIds(snapshot.nodes, 'node', errors)
  collectIds(snapshot.edges, 'edge', errors)

  for (const node of snapshot.nodes) {
    validateUnit(node.confidence, `nodes.${node.id}.confidence`, node.id, errors)
    if (node.type === EvidenceNodeType.RELATIONSHIP) {
      if (!nodeIds.has(node.subjectId))
        errors.push(
          issue(
            'ORPHAN_RELATIONSHIP_SUBJECT',
            'Relationship subject does not exist',
            node.id,
            `nodes.${node.id}.subjectId`,
          ),
        )
      if (!nodeIds.has(node.objectId))
        errors.push(
          issue(
            'ORPHAN_RELATIONSHIP_OBJECT',
            'Relationship object does not exist',
            node.id,
            `nodes.${node.id}.objectId`,
          ),
        )
    }
  }

  const connected = new Set<string>()
  for (const edge of snapshot.edges) {
    validateUnit(edge.confidence, `edges.${edge.id}.confidence`, edge.id, errors)
    validateUnit(edge.weight, `edges.${edge.id}.weight`, edge.id, errors)
    if (!nodeIds.has(edge.from))
      errors.push(issue('ORPHAN_EDGE_FROM', 'Edge source node does not exist', edge.id, `edges.${edge.id}.from`))
    else connected.add(edge.from)
    if (!nodeIds.has(edge.to))
      errors.push(issue('ORPHAN_EDGE_TO', 'Edge target node does not exist', edge.id, `edges.${edge.id}.to`))
    else connected.add(edge.to)
    if (edge.from === edge.to) errors.push(issue('SELF_EDGE', 'Self-referencing edges are not allowed', edge.id))
  }

  if (snapshot.nodes.length > 1) {
    for (const node of snapshot.nodes)
      if (!connected.has(node.id)) errors.push(issue('ORPHAN_NODE', 'Node is not connected to the graph', node.id))
  }

  for (const edgeType of FORBIDDEN_CYCLE_EDGE_TYPES) {
    if (
      hasCycle(
        snapshot.nodes,
        snapshot.edges.filter((edge) => edge.type === edgeType),
      )
    ) {
      errors.push(issue('FORBIDDEN_CYCLE', `Cycles are forbidden for ${edgeType} edges`))
    }
  }

  if (snapshot.nodes.length === 0) warnings.push(issue('EMPTY_GRAPH', 'Graph contains no nodes'))
  return { valid: errors.length === 0, errors, warnings }
}

function collectIds(values: readonly { id: string }[], kind: string, errors: GraphValidationIssue[]): Set<string> {
  const ids = new Set<string>()
  for (const value of values) {
    if (!value.id.trim()) errors.push(issue('EMPTY_ID', `${kind} id cannot be empty`))
    else if (ids.has(value.id)) errors.push(issue('DUPLICATE_ID', `Duplicate ${kind} id`, value.id))
    ids.add(value.id)
  }
  return ids
}

function validateUnit(value: number, path: string, id: string, errors: GraphValidationIssue[]): void {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    errors.push(issue('INVALID_CONFIDENCE', 'Value must be between 0 and 1', id, path))
}

function hasCycle(nodes: readonly EvidenceGraphNode[], edges: readonly EvidenceGraphEdge[]): boolean {
  const adjacency = new Map(nodes.map((node) => [node.id, [] as string[]]))
  for (const edge of edges) adjacency.get(edge.from)?.push(edge.to)
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true
    if (visited.has(id)) return false
    visiting.add(id)
    for (const next of adjacency.get(id) ?? []) if (visit(next)) return true
    visiting.delete(id)
    visited.add(id)
    return false
  }
  return nodes.some((node) => visit(node.id))
}

function issue(code: string, message: string, id?: string, path?: string): GraphValidationIssue {
  return { code, message, id, path }
}
