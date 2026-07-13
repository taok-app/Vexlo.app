import { createLogger } from '@/lib/logging'
import { propagateConfidence } from './confidence'
import { edgeIdentity, mergeEdges } from './edges'
import { mergeNodes, nodeIdentity } from './nodes'
import { EvidenceGraphQuery } from './query'
import { structuredExport } from './serializer'
import {
  EVIDENCE_GRAPH_VERSION,
  type ConfidencePropagationOptions,
  type EvidenceGraphEdge,
  type EvidenceGraphNode,
  type EvidenceGraphSnapshot,
  type GraphMergeResult,
  type GraphMetadata,
  type GraphTraversalOptions,
} from './types'
import { validateEvidenceGraph } from './validator'

const logger = createLogger('evidence-graph')

export class EvidenceGraph {
  private readonly nodeStore = new Map<string, EvidenceGraphNode>()
  private readonly edgeStore = new Map<string, EvidenceGraphEdge>()
  private readonly nodeIdentityIndex = new Map<string, string>()
  private readonly edgeIdentityIndex = new Map<string, string>()
  private graphMetadata: GraphMetadata
  readonly version: string

  constructor(snapshot?: Partial<EvidenceGraphSnapshot>) {
    this.version = snapshot?.version ?? EVIDENCE_GRAPH_VERSION
    this.graphMetadata = { ...snapshot?.metadata }
    if (snapshot) this.merge(snapshot)
    logger.info('Evidence graph created', {
      version: this.version,
      nodeCount: this.nodeStore.size,
      edgeCount: this.edgeStore.size,
    })
  }

  nodes(): EvidenceGraphNode[] {
    return [...this.nodeStore.values()].sort((left, right) => left.id.localeCompare(right.id))
  }

  edges(): EvidenceGraphEdge[] {
    return [...this.edgeStore.values()].sort((left, right) => left.id.localeCompare(right.id))
  }

  addNode(node: EvidenceGraphNode): EvidenceGraphNode {
    const identity = nodeIdentity(node)
    const existingId = this.nodeIdentityIndex.get(identity)
    const idMatch = this.nodeStore.get(node.id)
    if (idMatch && nodeIdentity(idMatch) !== identity) throw new Error(`Duplicate node id: ${node.id}`)
    const existing = existingId ? this.nodeStore.get(existingId) : idMatch
    const merged = existing ? mergeNodes(existing, node) : node
    this.nodeStore.set(merged.id, merged)
    this.nodeIdentityIndex.set(identity, merged.id)
    return merged
  }

  addEdge(edge: EvidenceGraphEdge): EvidenceGraphEdge {
    const identity = edgeIdentity(edge)
    const existingId = this.edgeIdentityIndex.get(identity)
    const idMatch = this.edgeStore.get(edge.id)
    if (idMatch && edgeIdentity(idMatch) !== identity) throw new Error(`Duplicate edge id: ${edge.id}`)
    const existing = existingId ? this.edgeStore.get(existingId) : idMatch
    const merged = existing ? mergeEdges(existing, edge) : edge
    this.edgeStore.set(merged.id, merged)
    this.edgeIdentityIndex.set(identity, merged.id)
    return merged
  }

  merge(input: Partial<EvidenceGraphSnapshot> | EvidenceGraph): GraphMergeResult {
    const startedAt = performance.now()
    const nodes = input instanceof EvidenceGraph ? input.nodes() : (input.nodes ?? [])
    const edges = input instanceof EvidenceGraph ? input.edges() : (input.edges ?? [])
    let addedNodes = 0
    let mergedNodes = 0
    let addedEdges = 0
    let mergedEdges = 0
    for (const node of [...nodes].sort((a, b) => a.id.localeCompare(b.id))) {
      const exists = this.nodeStore.has(node.id) || this.nodeIdentityIndex.has(nodeIdentity(node))
      this.addNode(node)
      if (exists) mergedNodes += 1
      else addedNodes += 1
    }
    for (const edge of [...edges].sort((a, b) => a.id.localeCompare(b.id))) {
      const exists = this.edgeStore.has(edge.id) || this.edgeIdentityIndex.has(edgeIdentity(edge))
      this.addEdge(edge)
      if (exists) mergedEdges += 1
      else addedEdges += 1
    }
    if (!(input instanceof EvidenceGraph)) this.graphMetadata = { ...this.graphMetadata, ...input.metadata }
    const result = {
      addedNodes,
      mergedNodes,
      addedEdges,
      mergedEdges,
      durationMs: Math.round(performance.now() - startedAt),
    }
    logger.info('Evidence graph merged', { ...result, nodeCount: this.nodeStore.size, edgeCount: this.edgeStore.size })
    return result
  }

  propagateConfidence(options?: ConfidencePropagationOptions): void {
    for (const node of propagateConfidence(this.nodes(), this.edges(), options)) this.nodeStore.set(node.id, node)
  }

  snapshot(): EvidenceGraphSnapshot {
    return { version: this.version, nodes: this.nodes(), edges: this.edges(), metadata: { ...this.graphMetadata } }
  }

  validate() {
    return validateEvidenceGraph(this.snapshot())
  }
  export() {
    return structuredExport(this.snapshot())
  }
  query() {
    return new EvidenceGraphQuery(this)
  }
  findClaim(value: string) {
    return this.query().findClaim(value)
  }
  findEvidence(value: string) {
    return this.query().findEvidence(value)
  }
  findEntity(value: string) {
    return this.query().findEntity(value)
  }
  findSource(value: string) {
    return this.query().findSource(value)
  }
  neighbors(id: string, options?: GraphTraversalOptions) {
    return this.query().neighbors(id, options)
  }
  subgraph(id: string, options?: GraphTraversalOptions) {
    return this.query().subgraph(id, options)
  }
  supports(id: string) {
    return this.query().supports(id)
  }
  contradictions(id: string) {
    return this.query().contradictions(id)
  }
}
