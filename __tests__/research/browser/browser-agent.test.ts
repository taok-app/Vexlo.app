import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { NativeFetchProvider } from '@/lib/agents/browser/providers/native-fetch'
import { TaskPriority } from '@/lib/research/planner/types'
import { SearchIntent, type SearchTask } from '@/lib/research/search'
import {
  ResearchBrowserAgent,
  TtlCache,
  deduplicateParagraphs,
  extractPage,
  isPathAllowed,
  normalizeSourceUrl,
  parseRobotsTxt,
  scoreSourceQuality,
  validateRawDocument,
  validateUrl,
  type RawBrowserDocument,
} from '@/lib/research/browser'

const task: SearchTask = {
  id: 'search_1',
  query: 'reliable browser extraction',
  intent: SearchIntent.EVIDENCE,
  priority: TaskPriority.HIGH,
  confidence: 0.9,
  expectedUsefulness: 0.9,
  sourceTypes: ['official'],
  rationale: 'Find primary sources',
}

function document(html: string, overrides: Partial<RawBrowserDocument> = {}): RawBrowserDocument {
  return {
    requestUrl: 'https://example.gov/article',
    finalUrl: 'https://example.gov/article',
    statusCode: 200,
    headers: { 'content-language': 'en' },
    contentType: 'text/html',
    charset: 'utf-8',
    html,
    responseSize: new TextEncoder().encode(html).byteLength,
    fetchedAt: new Date('2026-07-12T00:00:00Z'),
    provider: 'test',
    duration: 10,
    ...overrides,
  }
}

const articleHtml = `<!doctype html><html lang="en"><head>
<title>Fallback title</title><meta name="author" content="Ada Lovelace">
<meta property="article:published_time" content="2026-07-01T00:00:00Z">
<link rel="canonical" href="/canonical"><meta name="description" content="A useful source">
</head><body><nav>Navigation</nav><article><h1>Research title</h1>
<p>This is a detailed primary-source paragraph with enough useful information for extraction.</p>
<p>This second paragraph adds evidence, context, methods, findings, and conclusions for readers.</p>
</article><footer>Footer</footer></body></html>`

describe('research Browser Agent', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reuses the native fetch retry implementation', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('temporary', { status: 503 }))
      .mockResolvedValueOnce(new Response(articleHtml, { headers: { 'content-type': 'text/html' } }))
    vi.stubGlobal('fetch', fetchMock)
    const provider = new NativeFetchProvider({ id: 'native-fetch', retries: 1, retryDelayMs: 1 })
    const result = await provider.fetch({ requestId: 'request_1', url: 'https://example.gov/article' })
    expect(result.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('extracts clean semantic content and metadata', () => {
    const page = extractPage(document(articleHtml))
    expect(page.title).toBe('Research title')
    expect(page.content).toContain('##')
    expect(page.content).not.toContain('Navigation')
    expect(page.author).toBe('Ada Lovelace')
    expect(page.canonicalUrl).toBe('https://example.gov/canonical')
    expect(page.publishedAt?.toISOString()).toBe('2026-07-01T00:00:00.000Z')
  })

  it('normalizes URLs and removes duplicate paragraphs', () => {
    expect(normalizeSourceUrl('/story?utm_source=test&id=2#section', 'https://Example.com')).toBe(
      'https://example.com/story?id=2',
    )
    expect(deduplicateParagraphs('First paragraph.\n\nFirst   paragraph.\n\nSecond paragraph.')).toBe(
      'First paragraph.\n\nSecond paragraph.',
    )
  })

  it('validates URL, content type, size, and empty responses', () => {
    expect(validateUrl('file:///secret').valid).toBe(false)
    expect(validateUrl('https://example.com').valid).toBe(true)
    const invalid = validateRawDocument(document('', { contentType: 'application/pdf', responseSize: 200 }), 100)
    expect(invalid.errors.map((error) => error.code)).toEqual([
      'OVERSIZED_RESPONSE',
      'UNSUPPORTED_CONTENT',
      'EMPTY_RESPONSE',
    ])
  })

  it('expires cache entries and runs invalidation hooks', () => {
    let now = 1_000
    const events: string[] = []
    const cache = new TtlCache<string>({ now: () => now, onInvalidate: (event) => events.push(event.reason) })
    cache.set('https://example.com/?utm_source=x', 'value', 100)
    expect(cache.get('https://example.com')).toBe('value')
    now = 1_101
    expect(cache.get('https://example.com')).toBeUndefined()
    expect(events).toEqual(['expired'])
  })

  it('applies longest robots rule with Allow precedence', () => {
    const groups = parseRobotsTxt('User-agent: *\nDisallow: /private\nAllow: /private/public\n')
    expect(isPathAllowed(groups, '/private/report', 'VexloBrowser')).toBe(false)
    expect(isPathAllowed(groups, '/private/public/story', 'VexloBrowser')).toBe(true)
  })

  it('returns normalized quality scores', () => {
    const quality = scoreSourceQuality(extractPage(document(articleHtml)), 'https://example.gov/article')
    expect(Object.values(quality).every((score) => score >= 0 && score <= 1)).toBe(true)
    expect(quality.authority).toBe(0.95)
  })

  it('executes Search Tasks, retrieves sources, and reuses cached content', async () => {
    const search = {
      search: vi.fn(async () => ({
        results: [
          {
            id: 'result_1',
            title: 'Result',
            url: 'https://example.gov/article?utm_source=test',
            snippet: 'Snippet',
            provider: 'test',
            domain: 'example.gov',
            providerScore: 0.9,
            rankingScore: 0.95,
            metadata: {},
          },
        ],
      })),
    }
    const fetcher = { fetch: vi.fn(async () => document(articleHtml)) }
    const agent = new ResearchBrowserAgent(
      { search, fetcher, robots: { isAllowed: async () => true } },
      { maxSourcesPerTask: 1 },
    )
    const first = await agent.execute([task])
    const second = await agent.execute([task])
    expect(first.sources).toHaveLength(1)
    expect(first.sources[0]?.quality.overall).toBeGreaterThan(0)
    expect(second.metadata.cacheHits).toBe(1)
    expect(fetcher.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns typed partial failures without stack traces', async () => {
    const agent = new ResearchBrowserAgent({
      search: {
        search: async () => ({
          results: [{
            id: 'bad', title: 'Bad', url: 'https://example.com', snippet: '', provider: 'test',
            domain: 'example.com', providerScore: 0.5, rankingScore: 0.5, metadata: {},
          }],
        }),
      },
      fetcher: { fetch: async () => { throw new Error('DNS lookup failed') } },
      robots: { isAllowed: async () => true },
    })
    const result = await agent.execute([task])
    expect(result.sources).toHaveLength(0)
    expect(result.results[0]?.errors[0]).toMatchObject({ code: 'FETCH_FAILED', retryable: false })
    expect(JSON.stringify(result)).not.toContain('at ')
  })
})

void (undefined as unknown as RetrievedSource)
