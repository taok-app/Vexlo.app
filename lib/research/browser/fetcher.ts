import { BrowserAgent } from '@/lib/agents/browser'
import type { RawBrowserDocument } from '@/lib/agents/browser'
import type { ResearchPageFetcher } from './types'

export class ExistingBrowserFetcher implements ResearchPageFetcher {
  constructor(private readonly browser = new BrowserAgent()) {}

  async fetch(url: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<RawBrowserDocument> {
    const response = await this.browser.fetch(url, {
      timeoutMs: options.timeoutMs,
      signal: options.signal,
    })
    return response.document
  }
}
