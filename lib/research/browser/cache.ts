import type { CacheInvalidationEvent, ResearchCache } from './types'

interface CacheRecord<T> {
  value: T
  expiresAt: number
}

export interface TtlCacheOptions<T> {
  defaultTtlMs?: number
  now?: () => number
  onInvalidate?: (event: CacheInvalidationEvent<T>) => void
}

export class TtlCache<T> implements ResearchCache<T> {
  private readonly entries = new Map<string, CacheRecord<T>>()
  private readonly defaultTtlMs: number
  private readonly now: () => number
  private readonly onInvalidate?: (event: CacheInvalidationEvent<T>) => void

  constructor(options: TtlCacheOptions<T> = {}) {
    this.defaultTtlMs = options.defaultTtlMs ?? 60 * 60 * 1_000
    this.now = options.now ?? Date.now
    this.onInvalidate = options.onInvalidate
  }

  makeKey(value: string): string {
    try {
      const url = new URL(value)
      url.hash = ''
      url.hostname = url.hostname.toLocaleLowerCase()
      for (const key of [...url.searchParams.keys()]) {
        if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key)
      }
      url.searchParams.sort()
      return url.href.replace(/\/$/, '')
    } catch {
      return value.trim().toLocaleLowerCase()
    }
  }

  get(key: string): T | undefined {
    const normalized = this.makeKey(key)
    const entry = this.entries.get(normalized)
    if (!entry) return undefined
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(normalized)
      this.onInvalidate?.({ key: normalized, reason: 'expired', value: entry.value })
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new RangeError('Cache TTL must be greater than zero')
    const normalized = this.makeKey(key)
    const previous = this.entries.get(normalized)
    if (previous) this.onInvalidate?.({ key: normalized, reason: 'replaced', value: previous.value })
    this.entries.set(normalized, { value, expiresAt: this.now() + ttlMs })
  }

  delete(key: string): boolean {
    const normalized = this.makeKey(key)
    const entry = this.entries.get(normalized)
    const deleted = this.entries.delete(normalized)
    if (deleted) this.onInvalidate?.({ key: normalized, reason: 'deleted', value: entry?.value })
    return deleted
  }

  clear(): void {
    for (const [key, entry] of this.entries) {
      this.onInvalidate?.({ key, reason: 'cleared', value: entry.value })
    }
    this.entries.clear()
  }

  get size(): number {
    return this.entries.size
  }
}
