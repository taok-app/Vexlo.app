import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_GRAPH_VERSION,
  EvidenceEdgeType,
  EvidenceGraph,
  EvidenceGraphBuilder,
  EvidenceNodeType,
  createClaimNode,
  createEntityNode,
  createEvidenceEdge,
  createEvidenceNode,
  deserializeEvidenceGraph,
  serializeEvidenceGraph,
  validateEvidenceGraph,
  weightedConfidence,
  type EvidenceGraphSnapshot,
} from '@/lib/research/evidence'

describe('EvidenceGraph', () => {
  it('creates a deterministic graph with all node and edge fields', () => {
    const graph = connectedGraph()
    expect(graph.nodes()).toHaveLength(2)
    expect(graph.edges()).toHaveLength(1)
    expect(graph.edges()[0]).toMatchObject({ type: EvidenceEdgeType.SUPPORTS, weight: 0.8, confidence: 0.9 })
    expect(graph.validate().valid).toBe(true)
  })

  it('deduplicates semantic nodes and edges while merging traceability', () => {
    const graph = new EvidenceGraph()
    const first = graph.addNode(
      createClaimNode({ statement: 'Water boils at 100 C', confidence: 0.6, traceIds: ['run-a'] }),
    )
    const duplicate = graph.addNode(
      createClaimNode({ statement: ' water  boils at 100 c ', confidence: 0.9, traceIds: ['run-b'] }),
    )
    const evidence = graph.addNode(createEvidenceNode({ content: 'Measured at sea level', confidence: 0.8 }))
    graph.addEdge(
      createEvidenceEdge({
        from: evidence.id,
        to: first.id,
        type: EvidenceEdgeType.SUPPORTS,
        confidence: 0.6,
        traceIds: ['run-a'],
      }),
    )
    graph.addEdge(
      createEvidenceEdge({
        from: evidence.id,
        to: first.id,
        type: EvidenceEdgeType.SUPPORTS,
        confidence: 1,
        traceIds: ['run-b'],
      }),
    )

    expect(duplicate.id).toBe(first.id)
    expect(graph.nodes()).toHaveLength(2)
    expect(graph.findClaim(first.id)?.traceIds).toEqual(['run-a', 'run-b'])
    expect(graph.edges()).toHaveLength(1)
    expect(graph.edges()[0]?.traceIds).toEqual(['run-a', 'run-b'])
  })

  it('merges graphs incrementally and reports deterministic counts', () => {
    const left = connectedGraph()
    const right = new EvidenceGraph()
    const entity = right.addNode(createEntityNode({ name: 'Water', confidence: 0.9 }))
    const claim = left.findClaim('Water boils')!
    right.addNode(claim)
    right.addEdge(createEvidenceEdge({ from: claim.id, to: entity.id, type: EvidenceEdgeType.MENTIONS }))
    const result = left.merge(right)
    expect(result).toMatchObject({ addedNodes: 1, mergedNodes: 1, addedEdges: 1, mergedEdges: 0 })
    expect(left.findEntity('water')?.id).toBe(entity.id)
  })

  it('supports deterministic traversal, support, contradiction, and subgraph queries', () => {
    const graph = connectedGraph()
    const claim = graph.findClaim('Water boils')!
    const contrary = graph.addNode(createEvidenceNode({ content: 'At altitude it boils below 100 C', confidence: 0.8 }))
    graph.addEdge(createEvidenceEdge({ from: contrary.id, to: claim.id, type: EvidenceEdgeType.CONTRADICTS }))

    expect(graph.supports(claim.id).map((node) => node.type)).toEqual([EvidenceNodeType.EVIDENCE])
    expect(graph.contradictions(claim.id).map((node) => node.id)).toEqual([contrary.id])
    expect(graph.neighbors(claim.id).map((node) => node.id)).toEqual(
      [...graph.neighbors(claim.id).map((node) => node.id)].sort(),
    )
    expect(graph.subgraph(claim.id, { maxDepth: 1 }).nodes).toHaveLength(3)
  })

  it('serializes with stable ordering, graph version, and round-trips', () => {
    const graph = connectedGraph()
    const first = serializeEvidenceGraph(graph.snapshot())
    const second = serializeEvidenceGraph({ ...graph.snapshot(), nodes: [...graph.nodes()].reverse() })
    expect(first).toBe(second)
    const restored = deserializeEvidenceGraph(first)
    expect(restored.version).toBe(EVIDENCE_GRAPH_VERSION)
    expect(serializeEvidenceGraph(restored)).toBe(first)
    expect(graph.export()).toMatchObject({ nodeCount: 2, edgeCount: 1 })
  })

  it('rejects duplicate ids, orphan nodes and edges, invalid confidence, and forbidden cycles', () => {
    const claim = createClaimNode({ id: 'claim', statement: 'Claim', confidence: 2 })
    const evidence = createEvidenceNode({ id: 'evidence', content: 'Evidence' })
    const snapshot: EvidenceGraphSnapshot = {
      version: EVIDENCE_GRAPH_VERSION,
      metadata: {},
      nodes: [claim, { ...claim }, evidence, createEntityNode({ id: 'orphan', name: 'Orphan' })],
      edges: [
        {
          ...createEvidenceEdge({ id: 'a', from: 'claim', to: 'evidence', type: EvidenceEdgeType.DERIVED_FROM }),
          confidence: -1,
        },
        createEvidenceEdge({ id: 'b', from: 'evidence', to: 'claim', type: EvidenceEdgeType.DERIVED_FROM }),
        createEvidenceEdge({ id: 'c', from: 'missing', to: 'claim', type: EvidenceEdgeType.REFERENCES }),
      ],
    }
    const result = validateEvidenceGraph(snapshot)
    expect(result.valid).toBe(false)
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        'DUPLICATE_ID',
        'ORPHAN_NODE',
        'ORPHAN_EDGE_FROM',
        'INVALID_CONFIDENCE',
        'FORBIDDEN_CYCLE',
      ]),
    )
  })

  it('propagates normalized weighted confidence through support edges', () => {
    const graph = connectedGraph(0.2, 1)
    graph.propagateConfidence({ damping: 0.8, iterations: 1 })
    expect(graph.findClaim('Water boils')?.confidence).toBeCloseTo(0.76)
    expect(
      weightedConfidence([
        { confidence: 0.4, weight: 1 },
        { confidence: 0.8, weight: 3 },
      ]),
    ).toBeCloseTo(0.7)
  })

  it('builds from reasoning results with sources, entities, relationships, and traceability', () => {
    const graph = new EvidenceGraphBuilder()
      .addReasoningResult({
        id: 'reasoning-run',
        evidence: [{ id: 'ev-1', content: 'The measurement was repeated', confidence: 0.9 }],
        entities: [{ id: 'entity-1', name: 'Water', aliases: ['H2O'] }],
        claims: [
          { id: 'claim-1', statement: 'Water boils', evidenceIds: ['ev-1'], entityIds: ['entity-1'], confidence: 0.7 },
        ],
        relationships: [{ label: 'has state', subjectId: 'entity-1', objectId: 'claim-1' }],
      })
      .build({ propagateConfidence: false })

    const claim = graph.findClaim('Water boils')!
    expect(graph.supports(claim.id)).toHaveLength(1)
    expect(graph.findEntity('H2O')?.name).toBe('Water')
    expect(graph.nodes().some((node) => node.type === EvidenceNodeType.RELATIONSHIP)).toBe(true)
    expect(graph.validate().valid).toBe(true)
  })
})

function connectedGraph(claimConfidence = 0.7, evidenceConfidence = 0.8): EvidenceGraph {
  const graph = new EvidenceGraph()
  const claim = graph.addNode(createClaimNode({ statement: 'Water boils', confidence: claimConfidence }))
  const evidence = graph.addNode(
    createEvidenceNode({ content: 'Observed under controlled conditions', confidence: evidenceConfidence }),
  )
  graph.addEdge(
    createEvidenceEdge({
      from: evidence.id,
      to: claim.id,
      type: EvidenceEdgeType.SUPPORTS,
      weight: 0.8,
      confidence: 0.9,
    }),
  )
  return graph
}
