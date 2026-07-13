import { createEvidenceEdge } from './edges'
import { EvidenceGraph } from './graph'
import {
  createClaimNode,
  createEntityNode,
  createEvidenceNode,
  createRelationshipNode,
  createSourceNode,
} from './nodes'
import {
  EvidenceEdgeType,
  type EvidenceGraphSnapshot,
  type GraphMetadata,
  type ReasoningResultLike,
  type RetrievedSource,
} from './types'

export class EvidenceGraphBuilder {
  private readonly graph: EvidenceGraph

  constructor(snapshot?: Partial<EvidenceGraphSnapshot>) {
    this.graph = new EvidenceGraph(snapshot)
  }

  addReasoningResult(result: ReasoningResultLike): this {
    const trace = result.id ? [result.id] : []
    const idMap = new Map<string, string>()
    for (const source of result.sources ?? []) this.addSource(source)

    for (const item of result.entities ?? []) {
      const node = this.graph.addNode(createEntityNode({ ...item, traceIds: [...trace, ...(item.traceIds ?? [])] }))
      if (item.id) idMap.set(item.id, node.id)
    }
    for (const item of result.evidence ?? []) {
      const sourceId = item.sourceId ? (idMap.get(item.sourceId) ?? item.sourceId) : undefined
      const node = this.graph.addNode(
        createEvidenceNode({ ...item, sourceId, traceIds: [...trace, ...(item.traceIds ?? [])] }),
      )
      if (item.id) idMap.set(item.id, node.id)
      if (sourceId)
        this.graph.addEdge(
          createEvidenceEdge({
            from: node.id,
            to: sourceId,
            type: EvidenceEdgeType.DERIVED_FROM,
            confidence: node.confidence,
            traceIds: node.traceIds,
          }),
        )
    }
    for (const item of result.claims) {
      const claim = this.graph.addNode(createClaimNode({ ...item, traceIds: [...trace, ...(item.traceIds ?? [])] }))
      if (item.id) idMap.set(item.id, claim.id)
      for (const evidenceId of item.evidenceIds ?? [])
        this.connect(
          idMap.get(evidenceId) ?? evidenceId,
          claim.id,
          EvidenceEdgeType.SUPPORTS,
          claim.confidence,
          claim.traceIds,
        )
      for (const evidenceId of item.contradictingEvidenceIds ?? [])
        this.connect(
          idMap.get(evidenceId) ?? evidenceId,
          claim.id,
          EvidenceEdgeType.CONTRADICTS,
          claim.confidence,
          claim.traceIds,
        )
      for (const entityId of item.entityIds ?? [])
        this.connect(
          claim.id,
          idMap.get(entityId) ?? entityId,
          EvidenceEdgeType.MENTIONS,
          claim.confidence,
          claim.traceIds,
        )
    }
    for (const item of result.relationships ?? []) {
      const subjectId = idMap.get(item.subjectId) ?? item.subjectId
      const objectId = idMap.get(item.objectId) ?? item.objectId
      const relationship = this.graph.addNode(
        createRelationshipNode({ ...item, subjectId, objectId, traceIds: [...trace, ...(item.traceIds ?? [])] }),
      )
      if (item.id) idMap.set(item.id, relationship.id)
      this.connect(
        subjectId,
        relationship.id,
        EvidenceEdgeType.REFERENCES,
        relationship.confidence,
        relationship.traceIds,
      )
      this.connect(
        relationship.id,
        objectId,
        EvidenceEdgeType.REFERENCES,
        relationship.confidence,
        relationship.traceIds,
      )
    }
    return this
  }

  addSource(source: RetrievedSource): this {
    const sourceNode = this.graph.addNode(
      createSourceNode({
        id: source.id,
        title: source.title,
        url: source.url,
        author: source.author,
        publishedAt: source.publishedAt?.toISOString(),
        confidence: source.quality.overall,
        metadata: sourceMetadata(source),
        traceIds: [source.taskId],
      }),
    )
    const evidence = this.graph.addNode(
      createEvidenceNode({
        content: source.content,
        sourceId: sourceNode.id,
        confidence: source.quality.extractionConfidence,
        metadata: { query: source.query, fetchedAt: source.fetchedAt.toISOString() },
        traceIds: [source.taskId, source.id],
      }),
    )
    this.connect(evidence.id, sourceNode.id, EvidenceEdgeType.DERIVED_FROM, source.quality.overall, [source.taskId])
    return this
  }

  merge(input: EvidenceGraph | Partial<EvidenceGraphSnapshot>): this {
    this.graph.merge(input)
    return this
  }

  build(options: { propagateConfidence?: boolean } = {}): EvidenceGraph {
    if (options.propagateConfidence !== false) this.graph.propagateConfidence()
    return this.graph
  }

  private connect(
    from: string,
    to: string,
    type: EvidenceEdgeType,
    confidence: number,
    traceIds: readonly string[],
  ): void {
    this.graph.addEdge(createEvidenceEdge({ from, to, type, confidence, traceIds }))
  }
}

function sourceMetadata(source: RetrievedSource): GraphMetadata {
  return {
    domain: source.domain,
    contentType: source.contentType,
    contentSizeBytes: source.contentSizeBytes,
    searchRank: source.searchRank,
    searchScore: source.searchScore,
    fetchedAt: source.fetchedAt.toISOString(),
    language: source.language ?? null,
  }
}
