import { IntentType, TaskType, type ExecutionPlan } from '@/lib/research/planner/types'
import { SearchIntent, type QueryVariant } from './types'

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'how',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'with',
])
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u

export function normalizeQuery(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+(AND|OR)\s+(?=(AND|OR)\b)/gi, ' $1 ')
}

export function canonicalizeQuery(query: string): string {
  return normalizeQuery(query)
    .toLocaleLowerCase()
    .replace(/["'()]/g, '')
    .replace(/\s+(and|or)\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
}

export function detectLanguage(text: string): string | undefined {
  return CJK.test(text) ? 'multilingual' : undefined
}

export function extractQuotedPhrases(text: string): string[] {
  return [...text.matchAll(/["“]([^"”]{2,80})["”]/g)].map((match) => normalizeQuery(match[1]))
}

export function extractKeywords(text: string, limit = 10): string[] {
  const tokens = text.toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}+#.-]*/gu) ?? []
  return [...new Set(tokens.filter((token) => token.length > 1 && !STOP_WORDS.has(token)))].slice(0, limit)
}

export function classifySearchIntent(intent: IntentType, text: string): SearchIntent {
  const normalized = text.toLocaleLowerCase()
  if (
    /\b(compare|versus|vs\.?|difference)\b/.test(normalized) ||
    intent === IntentType.ANALYTICAL ||
    intent === IntentType.DECISION_SUPPORT
  )
    return SearchIntent.COMPARISON
  if (/\b(how to|steps?|guide|tutorial)\b/.test(normalized) || intent === IntentType.INSTRUCTIONAL)
    return SearchIntent.HOW_TO
  if (/\b(evidence|study|data|statistics|source)\b/.test(normalized)) return SearchIntent.EVIDENCE
  if (/\b(what is|define|meaning)\b/.test(normalized)) return SearchIntent.DEFINITION
  if (intent === IntentType.EXPLANATORY || /\bwhy\b/.test(normalized)) return SearchIntent.EXPLANATION
  return SearchIntent.DISCOVERY
}

export function buildQueryVariants(plan: ExecutionPlan): QueryVariant[] {
  const searchableTasks = plan.tasks.filter((task) => task.type === TaskType.SEARCH || task.type === TaskType.RETRIEVE)
  const language = detectLanguage(`${plan.query} ${plan.objective}`)
  const variants: QueryVariant[] = []
  for (const generated of plan.searchQueries) {
    variants.push({
      query: normalizeQuery(generated.query.query),
      kind: 'original',
      sourceTaskId: generated.supportsTask,
      language: generated.query.language ?? language,
    })
  }
  const sources = searchableTasks.length > 0 ? searchableTasks : plan.tasks.slice(0, 1)
  for (const task of sources) {
    const text = `${plan.objective} ${task.description}`
    const keywords = extractKeywords(text)
    const phrases = extractQuotedPhrases(`${plan.query} ${task.description}`)
    const natural = normalizeQuery(task.description || plan.query)
    if (natural) variants.push({ query: natural, kind: 'natural', sourceTaskId: task.id, language })
    if (phrases.length > 0)
      variants.push({
        query: phrases.map((phrase) => `"${phrase}"`).join(' '),
        kind: 'quoted',
        sourceTaskId: task.id,
        language,
      })
    if (keywords.length > 1)
      variants.push({ query: keywords.slice(0, 6).join(' AND '), kind: 'boolean', sourceTaskId: task.id, language })
  }
  if (variants.length === 0) variants.push({ query: normalizeQuery(plan.query), kind: 'natural', language })
  return variants.filter((variant) => variant.query.length > 0)
}

export function deduplicateVariants(variants: QueryVariant[]): QueryVariant[] {
  const seen = new Set<string>()
  return variants.filter((variant) => {
    const key = canonicalizeQuery(variant.query)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const QueryBuilder = { build: buildQueryVariants, normalize: normalizeQuery, canonicalize: canonicalizeQuery }

export function taskIntent(plan: ExecutionPlan, query: string): SearchIntent {
  return classifySearchIntent(plan.intent, query)
}

export function findPlanTask(plan: ExecutionPlan, id?: string) {
  return id ? plan.tasks.find((task) => task.id === id) : undefined
}

export function isSearchablePlanTask(task: ExecutionPlan['tasks'][number]): boolean {
  return task.type === TaskType.SEARCH || task.type === TaskType.RETRIEVE
}

export function objectiveTerms(plan: ExecutionPlan): string[] {
  return extractKeywords(`${plan.query} ${plan.objective}`, 12)
}

export function includesObjectiveTerm(plan: ExecutionPlan, query: string): boolean {
  const normalized = query.toLocaleLowerCase()
  return objectiveTerms(plan).some((term) => normalized.includes(term))
}

export function safeQueryLength(query: string): boolean {
  return query.length >= 2 && query.length <= 500
}

export function intentLabel(intent: SearchIntent): string {
  return intent.replace('_', ' ')
}

export function quoteTerm(term: string): string {
  return `"${term.replace(/["“”]/g, '')}"`
}

export function combineQuery(query: string, term: string): string {
  return normalizeQuery(`${query} ${quoteTerm(term)}`)
}

export function sourceTaskDescription(plan: ExecutionPlan, id?: string): string | undefined {
  return findPlanTask(plan, id)?.description
}

export function planSearchText(plan: ExecutionPlan): string {
  return normalizeQuery(`${plan.query} ${plan.objective}`)
}

export function hasMultilingualSignal(plan: ExecutionPlan): boolean {
  return detectLanguage(planSearchText(plan)) !== undefined
}

export function normalizeOptionalLanguage(language?: string): string | undefined {
  const normalized = language?.trim().toLocaleLowerCase()
  return normalized || undefined
}

export function variantKey(variant: QueryVariant): string {
  return `${canonicalizeQuery(variant.query)}:${variant.language ?? ''}`
}

export function deduplicateVariantsByLanguage(variants: QueryVariant[]): QueryVariant[] {
  const seen = new Set<string>()
  return variants.filter((variant) => {
    const key = variantKey(variant)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function extractEntities(text: string): string[] {
  return [...new Set(text.match(/\b[A-Z][\p{L}\d]*(?:\s+[A-Z][\p{L}\d]*)*/gu) ?? [])]
}

export function queryFeatures(query: string) {
  return {
    keywords: extractKeywords(query),
    phrases: extractQuotedPhrases(query),
    entities: extractEntities(query),
    language: detectLanguage(query),
  }
}

export function planQueryFeatures(plan: ExecutionPlan) {
  return queryFeatures(planSearchText(plan))
}

export function boundedVariants(plan: ExecutionPlan, limit: number): QueryVariant[] {
  return deduplicateVariantsByLanguage(buildQueryVariants(plan)).slice(0, Math.max(1, limit))
}

export function resolveVariantTask(plan: ExecutionPlan, variant: QueryVariant) {
  return findPlanTask(plan, variant.sourceTaskId)
}

export function variantPriority(plan: ExecutionPlan, variant: QueryVariant) {
  return resolveVariantTask(plan, variant)?.priority
}

export function variantRationale(plan: ExecutionPlan, variant: QueryVariant): string {
  return sourceTaskDescription(plan, variant.sourceTaskId) ?? `Supports the plan objective: ${plan.objective}`
}

export function variantIntent(plan: ExecutionPlan, variant: QueryVariant): SearchIntent {
  return taskIntent(plan, variant.query)
}

export function isBooleanQuery(query: string): boolean {
  return /\s(?:AND|OR)\s/.test(query)
}

export function isQuotedQuery(query: string): boolean {
  return /["“][^"”]+["”]/.test(query)
}

export function compactQuery(query: string, maxLength = 500): string {
  const normalized = normalizeQuery(query)
  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength).trim()
}

export function sanitizeVariant(variant: QueryVariant): QueryVariant {
  return { ...variant, query: compactQuery(variant.query), language: normalizeOptionalLanguage(variant.language) }
}

export function sanitizeVariants(variants: QueryVariant[]): QueryVariant[] {
  return deduplicateVariantsByLanguage(
    variants.map(sanitizeVariant).filter((variant) => safeQueryLength(variant.query)),
  )
}

export function buildQueries(plan: ExecutionPlan): QueryVariant[] {
  return sanitizeVariants(buildQueryVariants(plan))
}

export default QueryBuilder
