import { createLogger } from '@/lib/logging'
import { canonicalText } from './nodes'
import {
  EVIDENCE_GRAPH_VERSION,
  EvidenceEdgeType,
  EvidenceNodeType,
  type ClaimNode,
  type EntityNode,
  type EvidenceGraphEdge,
  type EvidenceGraphNode,
  type EvidenceGraphSnapshot,
  type EvidenceNode,
  type GraphTraversalOptions,
  type SourceNode,
} from './types'

const logger = createLogger('evidence-graph-query')

export interface GraphQuerySource {
  nodes(): readonly EvidenceGraphNode[]
  edges(): readonly EvidenceGraphEdge[]
}

export class EvidenceGraphQuery {
  constructor(private readonly graph: GraphQuerySource) {}

  findClaim(idOrStatement: string): ClaimNode | undefined {
    return this.findTyped(EvidenceNodeType.CLAIM, idOrStatement, (node) => node.statement)
  }

  findEvidence(idOrContent: string): EvidenceNode | undefined {
    return this.findTyped(EvidenceNodeType.EVIDENCE, idOrContent, (node) => node.content)
  }

  findEntity(idOrName: string): EntityNode | undefined {
    const key = canonicalText(idOrName)
    return this.sortedNodes().find(
      (node): node is EntityNode =>
        node.type === EvidenceNodeType.ENTITY &&
        (node.id === idOrName ||
          canonicalText(node.name) === key ||
          node.aliases.some((alias) => canonicalText(alias) === key)),
    )
  }

  findSource(idOrUrl: string): SourceNode | undefined {
    return this.findTyped(EvidenceNodeType.SOURCE, idOrUrl, (node) => node.url)
  }

  neighbors(nodeId: string, options: GraphTraversalOptions = {}): EvidenceGraphNode[] {
    const startedAt = performance.now()
    const direction = options.direction ?? 'both'
    const types = options.edgeTypes ? new Set(options.edgeTypes) : undefined
    const ids = new Set<string>()
    for (const edge of this.graph.edges()) {
      if (types && !types.has(edge.type)) continue
      if ((direction === 'outgoing' || direction === 'both') && edge.from === nodeId) ids.add(edge.to)
      if ((direction === 'incoming' || direction === 'both') && edge.to === nodeId) ids.add(edge.from)
    }
    const result = this.sortedNodes().filter((node) => ids.has(node.id))
    logger.debug('Evidence graph query completed', {
      operation: 'neighbors',
      resultCount: result.length,
      durationMs: Math.round(performance.now() - startedAt),
    })
    return result
  }

  subgraph(rootId: string, options: GraphTraversalOptions = {}): EvidenceGraphSnapshot {
    const maxDepth = Math.max(0, Math.floor(options.maxDepth ?? 1))
    const included = new Set([rootId])
    let frontier = [rootId]
    for (let depth = 0; depth < maxDepth; depth += 1) {
      const next = new Set<string>()
      for (const id of frontier)
        for (const node of this.neighbors(id, options)) if (!included.has(node.id)) next.add(node.id)
      for (const id of next) included.add(id)
      frontier = [...next].sort()
    }
    const nodes = this.sortedNodes().filter((node) => included.has(node.id))
    const edges = this.sortedEdges().filter((edge) => included.has(edge.from) && included.has(edge.to))
    return { version: EVIDENCE_GRAPH_VERSION, nodes, edges, metadata: { rootId, maxDepth } }
  }

  supports(claimId: string): EvidenceGraphNode[] {
    return this.connectedToClaim(claimId, EvidenceEdgeType.SUPPORTS)
  }

  contradictions(claimId: string): EvidenceGraphNode[] {
    return this.connectedToClaim(claimId, EvidenceEdgeType.CONTRADICTS)
  }

  private connectedToClaim(claimId: string, type: EvidenceEdgeType): EvidenceGraphNode[] {
    const ids = new Set(
      this.graph
        .edges()
        .filter((edge) => edge.to === claimId && edge.type === type)
        .map((edge) => edge.from),
    )
    return this.sortedNodes().filter((node) => ids.has(node.id))
  }

  private findTyped<T extends ClaimNode | EvidenceNode | SourceNode>(
    type: T['type'],
    value: string,
    content: (node: T) => string,
  ): T | undefined {
    const key = canonicalText(value)
    return this.sortedNodes().find(
      (node): node is T => node.type === type && (node.id === value || canonicalText(content(node as T)) === key),
    )
  }

  private sortedNodes(): EvidenceGraphNode[] {
    return [...this.graph.nodes()].sort((a, b) => a.id.localeCompare(b.id))
  }
  private sortedEdges(): EvidenceGraphEdge[] {
    return [...this.graph.edges()].sort((a, b) => a.id.localeCompare(b.id))
  }
}
