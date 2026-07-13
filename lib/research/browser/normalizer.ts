import { decode } from 'html-entities'

const TRACKING_PARAMETERS = /^(utm_|fbclid|gclid|mc_cid|mc_eid)/i

export function normalizeText(value: string): string {
  return decode(value)
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function deduplicateParagraphs(value: string): string {
  const seen = new Set<string>()
  return normalizeText(value)
    .split(/\n{2,}/)
    .filter((paragraph) => {
      const key = paragraph.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join('\n\n')
}

export function normalizeContent(value: string): string {
  return deduplicateParagraphs(value)
}

export function normalizeSourceUrl(value: string, baseUrl?: string): string | undefined {
  try {
    const url = baseUrl ? new URL(value, baseUrl) : new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMETERS.test(key)) url.searchParams.delete(key)
    }
    url.searchParams.sort()
    return url.href
  } catch {
    return undefined
  }
}

export function normalizeMetadata(metadata: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metadata)
      .map(([key, value]) => [key.toLocaleLowerCase().trim(), normalizeText(value)] as const)
      .filter(([, value]) => value.length > 0),
  )
}
