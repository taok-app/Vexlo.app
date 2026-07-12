import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import type { ExtractedPage, RawBrowserDocument, SourceQuality } from './types'
import { normalizeContent, normalizeMetadata, normalizeSourceUrl, normalizeText } from './normalizer'

const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'iframe',
  'nav',
  'footer',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
  '[aria-hidden="true"]',
  '.advertisement',
  '.advert',
  '.ads',
  '.cookie',
  '.newsletter',
  '.social-share',
].join(',')

const CONTENT_SELECTORS = ['article', 'main', '[role="main"]', '.article-content', '.post-content', '.entry-content']
const DATE_KEYS = ['article:published_time', 'date', 'datepublished', 'pubdate', 'publish-date']
const AUTHOR_KEYS = ['author', 'article:author', 'byl']

function metaValue($: cheerio.CheerioAPI, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = $(`meta[name="${key}"], meta[property="${key}"], meta[itemprop="${key}"]`).first().attr('content')
    if (value?.trim()) return normalizeText(value)
  }
  return undefined
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function serializeContent($: cheerio.CheerioAPI, nodes: cheerio.Cheerio<AnyNode>): string {
  const blocks: string[] = []
  nodes.find('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre').each((_, element) => {
    const text = normalizeText($(element).text())
    if (!text) return
    const tag = element.type === 'tag' ? element.name.toLocaleLowerCase() : ''
    if (/^h[1-6]$/.test(tag)) blocks.push(`${'#'.repeat(Number(tag[1]))} ${text}`)
    else if (tag === 'li') blocks.push(`- ${text}`)
    else if (tag === 'blockquote') blocks.push(`> ${text}`)
    else blocks.push(text)
  })
  return normalizeContent(blocks.join('\n\n'))
}

export function extractPage(document: RawBrowserDocument): ExtractedPage {
  if (document.contentType === 'text/plain') {
    return {
      title: new URL(document.finalUrl).hostname,
      content: normalizeContent(document.html),
      headings: [],
      canonicalUrl: normalizeSourceUrl(document.finalUrl),
      language: document.headers['content-language']?.split(',')[0]?.trim(),
      metadata: {},
    }
  }

  const $ = cheerio.load(document.html)
  $(REMOVE_SELECTORS).remove()
  const metadata: Record<string, string> = {}
  $('meta[name], meta[property]').each((_, element) => {
    const key = $(element).attr('name') ?? $(element).attr('property')
    const value = $(element).attr('content')
    if (key && value && key.length <= 100 && value.length <= 2_000) metadata[key] = value
  })
  const normalizedMetadata = normalizeMetadata(metadata)
  const root =
    CONTENT_SELECTORS.map((selector) => $(selector).first()).find((candidate) => candidate.length > 0) ?? $('body')
  let content = serializeContent($, root)
  if (content.length < 100) content = normalizeContent(root.text())

  const title = normalizeText(
    metaValue($, ['og:title', 'twitter:title']) ?? $('h1').first().text() ?? $('title').first().text(),
  )
  const canonical = $('link[rel="canonical"]').first().attr('href')
  const published = metaValue($, DATE_KEYS) ?? $('time[datetime]').first().attr('datetime')
  const modified = metaValue($, ['article:modified_time', 'datemodified', 'last-modified'])

  return {
    title,
    content,
    headings: root
      .find('h1, h2, h3, h4, h5, h6')
      .map((_, element) => normalizeText($(element).text()))
      .get()
      .filter(Boolean),
    author:
      metaValue($, AUTHOR_KEYS) ??
      (normalizeText($('[rel="author"], .byline, [itemprop="author"]').first().text()) || undefined),
    publishedAt: parseDate(published),
    modifiedAt: parseDate(modified),
    canonicalUrl: normalizeSourceUrl(canonical ?? document.finalUrl, document.finalUrl),
    description: metaValue($, ['description', 'og:description', 'twitter:description']),
    language: $('html').attr('lang')?.trim() || document.headers['content-language']?.split(',')[0]?.trim(),
    metadata: normalizedMetadata,
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function scoreSourceQuality(page: ExtractedPage, url: string, fetchedAt = new Date()): SourceQuality {
  const contentLength = page.content.length
  const completeness =
    clamp(contentLength / 4_000) * 0.65 +
    (page.title ? 0.15 : 0) +
    (page.headings.length ? 0.1 : 0) +
    (page.author ? 0.1 : 0)
  const date = page.modifiedAt ?? page.publishedAt
  const ageDays = date ? Math.max(0, (fetchedAt.getTime() - date.getTime()) / 86_400_000) : undefined
  const freshness = ageDays === undefined ? 0.5 : clamp(1 - ageDays / (365 * 5))
  const hostname = new URL(url).hostname.toLocaleLowerCase()
  const authority =
    hostname.endsWith('.gov') || hostname.endsWith('.edu') ? 0.95 : hostname.endsWith('.org') ? 0.75 : 0.6
  const extractionConfidence = clamp(
    0.35 +
      (contentLength >= 500 ? 0.25 : 0) +
      (page.title ? 0.15 : 0) +
      (page.canonicalUrl ? 0.1 : 0) +
      (page.headings.length ? 0.15 : 0),
  )
  const overall = completeness * 0.3 + freshness * 0.2 + authority * 0.25 + extractionConfidence * 0.25
  return {
    completeness: clamp(completeness),
    freshness,
    authority,
    extractionConfidence,
    overall: clamp(overall),
  }
}
