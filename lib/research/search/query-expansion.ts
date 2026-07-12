import { combineQuery, deduplicateVariantsByLanguage } from './query-builder'
import type { ExpansionCategory, ExpansionOptions, KnowledgeExpansionAdapter, QueryVariant } from './types'

const TERMS: Record<string, Array<{ term: string; category: ExpansionCategory }>> = {
  ai: [{ term: 'artificial intelligence', category: 'abbreviation' }],
  api: [{ term: 'application programming interface', category: 'abbreviation' }],
  js: [{ term: 'JavaScript', category: 'alias' }],
  cost: [{ term: 'pricing', category: 'synonym' }],
  compare: [{ term: 'alternatives', category: 'related' }],
  security: [{ term: 'risk', category: 'related' }],
}

const DEFAULT_CATEGORIES: ExpansionCategory[] = ['synonym', 'abbreviation', 'alias', 'related']

export async function expandQueryVariants(
  variants: QueryVariant[],
  adapter?: KnowledgeExpansionAdapter,
  options: ExpansionOptions = {},
): Promise<{ variants: QueryVariant[]; warnings: string[] }> {
  if (options.enabled === false) return { variants, warnings: [] }
  const categories = options.categories ?? DEFAULT_CATEGORIES
  const limit = Math.max(0, Math.min(options.maxVariantsPerQuery ?? 2, 10))
  const expanded: QueryVariant[] = [...variants]
  const warnings: string[] = []

  for (const variant of variants) {
    const deterministic = Object.entries(TERMS)
      .filter(([key]) => new RegExp(`(^|[\\s"'(])${key}(?=$|[\\s"'),])`, 'u').test(variant.query.toLocaleLowerCase()))
      .flatMap(([, values]) => values)
      .filter((value) => categories.includes(value.category))
    let terms = deterministic
    if (adapter && limit > 0) {
      try {
        const knowledge = await adapter.expandQuery({
          query: variant.query,
          categories,
          limit,
          language: variant.language,
        })
        terms = [...terms, ...knowledge.filter((value) => categories.includes(value.category))]
      } catch {
        warnings.push('Knowledge expansion was unavailable; deterministic expansion was used.')
      }
    }
    const seen = new Set<string>()
    for (const value of terms) {
      const normalized = value.term.trim().toLocaleLowerCase()
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      expanded.push({
        ...variant,
        query: combineQuery(variant.query, value.term),
        kind: 'expanded',
        expansionCategories: [...(variant.expansionCategories ?? []), value.category],
      })
      if (seen.size >= limit) break
    }
  }
  return { variants: deduplicateVariantsByLanguage(expanded), warnings }
}

export const QueryExpansion = { expand: expandQueryVariants }
