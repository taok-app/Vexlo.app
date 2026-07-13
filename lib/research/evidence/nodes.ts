import {
  EvidenceNodeType,
  type ClaimNode,
  type EntityNode,
  type EvidenceGraphNode,
  type EvidenceNode,
  type GraphMetadata,
  type RelationshipNode,
  type SourceNode,
} from './types'

export function normalizeConfidence(value: number | undefined, fallback = 0.5): number {
  if (value === undefined || !Number.isFinite(value)) return Math.max(0, Math.min(1, fallback))
  return Math.max(0, Math.min(1, value))
}

export function canonicalText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function stableId(prefix: string, value: string): string {
  let hash = 2166136261
  for (const character of canonicalText(value)) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`
}

function base<T extends EvidenceNodeType>(
  type: T,
  identity: string,
  confidence?: number,
  metadata: GraphMetadata = {},
  traceIds: readonly string[] = [],
  id?: string,
) {
  return {
    id: id?.trim() || stableId(type, identity),
    type,
    confidence: normalizeConfidence(confidence),
    metadata: { ...metadata },
    traceIds: uniqueStrings(traceIds),
  }
}

export function createClaimNode(
  input: Omit<ClaimNode, 'id' | 'type' | 'confidence' | 'metadata' | 'traceIds'> &
    Partial<Pick<ClaimNode, 'id' | 'confidence' | 'metadata' | 'traceIds'>>,
): ClaimNode {
  const statement = input.statement.trim()
  return {
    ...base(EvidenceNodeType.CLAIM, statement, input.confidence, input.metadata, input.traceIds, input.id),
    statement,
  }
}

export function createEvidenceNode(
  input: Omit<EvidenceNode, 'id' | 'type' | 'confidence' | 'metadata' | 'traceIds'> &
    Partial<Pick<EvidenceNode, 'id' | 'confidence' | 'metadata' | 'traceIds'>>,
): EvidenceNode {
  const content = input.content.trim()
  return {
    ...base(
      EvidenceNodeType.EVIDENCE,
      `${input.sourceId ?? ''}:${content}`,
      input.confidence,
      input.metadata,
      input.traceIds,
      input.id,
    ),
    content,
    sourceId: input.sourceId,
  }
}

export function createEntityNode(
  input: Omit<EntityNode, 'id' | 'type' | 'confidence' | 'metadata' | 'traceIds' | 'aliases'> &
    Partial<Pick<EntityNode, 'id' | 'confidence' | 'metadata' | 'traceIds' | 'aliases'>>,
): EntityNode {
  const name = input.name.trim()
  return {
    ...base(
      EvidenceNodeType.ENTITY,
      `${input.entityType ?? ''}:${name}`,
      input.confidence,
      input.metadata,
      input.traceIds,
      input.id,
    ),
    name,
    entityType: input.entityType,
    aliases: uniqueStrings(input.aliases ?? []),
  }
}

export function createSourceNode(
  input: Omit<SourceNode, 'id' | 'type' | 'confidence' | 'metadata' | 'traceIds'> &
    Partial<Pick<SourceNode, 'id' | 'confidence' | 'metadata' | 'traceIds'>>,
): SourceNode {
  const url = input.url.trim()
  return {
    ...base(EvidenceNodeType.SOURCE, url, input.confidence, input.metadata, input.traceIds, input.id),
    title: input.title.trim(),
    url,
    author: input.author,
    publishedAt: input.publishedAt,
  }
}

export function createRelationshipNode(
  input: Omit<RelationshipNode, 'id' | 'type' | 'confidence' | 'metadata' | 'traceIds'> &
    Partial<Pick<RelationshipNode, 'id' | 'confidence' | 'metadata' | 'traceIds'>>,
): RelationshipNode {
  const label = input.label.trim()
  return {
    ...base(
      EvidenceNodeType.RELATIONSHIP,
      `${input.subjectId}:${label}:${input.objectId}`,
      input.confidence,
      input.metadata,
      input.traceIds,
      input.id,
    ),
    label,
    subjectId: input.subjectId,
    objectId: input.objectId,
  }
}

export function nodeIdentity(node: EvidenceGraphNode): string {
  switch (node.type) {
    case EvidenceNodeType.CLAIM:
      return `${node.type}:${canonicalText(node.statement)}`
    case EvidenceNodeType.EVIDENCE:
      return `${node.type}:${node.sourceId ?? ''}:${canonicalText(node.content)}`
    case EvidenceNodeType.ENTITY:
      return `${node.type}:${node.entityType ?? ''}:${canonicalText(node.name)}`
    case EvidenceNodeType.SOURCE:
      return `${node.type}:${canonicalText(node.url)}`
    case EvidenceNodeType.RELATIONSHIP:
      return `${node.type}:${node.subjectId}:${canonicalText(node.label)}:${node.objectId}`
  }
}

export function mergeNodes(existing: EvidenceGraphNode, incoming: EvidenceGraphNode): EvidenceGraphNode {
  if (existing.type !== incoming.type) throw new Error(`Cannot merge node types ${existing.type} and ${incoming.type}`)
  if (existing.type === EvidenceNodeType.ENTITY && incoming.type === EvidenceNodeType.ENTITY) {
    return {
      ...existing,
      confidence: Math.max(existing.confidence, incoming.confidence),
      metadata: { ...existing.metadata, ...incoming.metadata },
      traceIds: uniqueStrings([...existing.traceIds, ...incoming.traceIds]),
      aliases: uniqueStrings([...existing.aliases, ...incoming.aliases]),
    }
  }
  return {
    ...existing,
    confidence: Math.max(existing.confidence, incoming.confidence),
    metadata: { ...existing.metadata, ...incoming.metadata },
    traceIds: uniqueStrings([...existing.traceIds, ...incoming.traceIds]),
  }
}

export function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort()
}
