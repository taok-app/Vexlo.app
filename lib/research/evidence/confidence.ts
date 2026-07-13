import { normalizeConfidence } from './nodes'
import {
  EvidenceEdgeType,
  EvidenceNodeType,
  type ConfidencePropagationOptions,
  type EvidenceGraphEdge,
  type EvidenceGraphNode,
} from './types'

export function weightedConfidence(values: readonly { confidence: number; weight: number }[]): number {
  const usable = values.filter(
    (value) => Number.isFinite(value.confidence) && Number.isFinite(value.weight) && value.weight > 0,
  )
  const weight = usable.reduce((sum, value) => sum + value.weight, 0)
  if (weight === 0) return 0
  return normalizeConfidence(
    usable.reduce((sum, value) => sum + normalizeConfidence(value.confidence) * value.weight, 0) / weight,
    0,
  )
}

export function propagateConfidence(
  nodes: readonly EvidenceGraphNode[],
  edges: readonly EvidenceGraphEdge[],
  options: ConfidencePropagationOptions = {},
): EvidenceGraphNode[] {
  const damping = normalizeConfidence(options.damping, 0.85)
  const iterations = Math.max(1, Math.floor(options.iterations ?? 4))
  const base = new Map(nodes.map((node) => [node.id, normalizeConfidence(node.confidence)]))
  let scores = new Map(base)
  const orderedEdges = [...edges].sort((left, right) => left.id.localeCompare(right.id))

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = new Map(scores)
    for (const node of nodes) {
      if (node.type !== EvidenceNodeType.CLAIM) continue
      const relevant = orderedEdges.filter(
        (edge) =>
          edge.to === node.id &&
          (edge.type === EvidenceEdgeType.SUPPORTS || edge.type === EvidenceEdgeType.CONTRADICTS),
      )
      if (relevant.length === 0) continue
      const support = weightedConfidence(
        relevant.map((edge) => ({
          confidence:
            (scores.get(edge.from) ?? 0) * edge.confidence * (edge.type === EvidenceEdgeType.CONTRADICTS ? -1 : 1),
          weight: edge.weight,
        })),
      )
      const signed = relevant.some((edge) => edge.type === EvidenceEdgeType.CONTRADICTS)
        ? relevant.reduce(
            (sum, edge) =>
              sum +
              (scores.get(edge.from) ?? 0) *
                edge.confidence *
                edge.weight *
                (edge.type === EvidenceEdgeType.CONTRADICTS ? -1 : 1),
            0,
          ) /
          Math.max(
            1,
            relevant.reduce((sum, edge) => sum + edge.weight, 0),
          )
        : support
      next.set(
        node.id,
        normalizeConfidence((base.get(node.id) ?? 0) * (1 - damping) + normalizeConfidence(signed, 0) * damping),
      )
    }
    scores = next
  }
  return nodes.map((node) => ({ ...node, confidence: scores.get(node.id) ?? node.confidence }))
}
