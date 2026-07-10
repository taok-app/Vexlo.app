import type { BrowserProvider } from './provider'
import {
  DEFAULT_ACCEPT_LANGUAGE,
  DEFAULT_BROWSER_RETRIES,
  DEFAULT_BROWSER_RETRY_DELAY_MS,
  DEFAULT_BROWSER_TIMEOUT_MS,
  DEFAULT_BROWSER_USER_AGENT,
  DEFAULT_COMPRESSION,
  DEFAULT_MAX_REDIRECTS,
  MAX_BROWSER_TIMEOUT_MS,
  MAX_PAGE_SIZE_BYTES,
  SUPPORTED_CONTENT_TYPES,
} from './constants'
import { ValidationError } from './errors'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:factory')

export interface BrowserProviderConfig {
  id: string
  enabled?: boolean
  priority?: number
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
  maxRedirects?: number
  userAgent?: string
  acceptLanguage?: string
  compression?: boolean
  requestHeaders?: Record<string, string>
  maxPageSizeBytes?: number
  supportedContentTypes?: readonly string[]
  config?: Record<string, unknown>
}

export interface ResolvedBrowserProviderConfig {
  id: string
  enabled: boolean
  priority: number
  timeoutMs: number
  retries: number
  retryDelayMs: number
  maxRedirects: number
  userAgent: string
  acceptLanguage: string
  compression: boolean
  requestHeaders: Record<string, string>
  maxPageSizeBytes: number
  supportedContentTypes: readonly string[]
  config: Record<string, unknown>
}

export const DEFAULT_BROWSER_PROVIDER_CONFIG: Omit<ResolvedBrowserProviderConfig, 'id'> = {
  enabled: true,
  priority: 100,
  timeoutMs: DEFAULT_BROWSER_TIMEOUT_MS,
  retries: DEFAULT_BROWSER_RETRIES,
  retryDelayMs: DEFAULT_BROWSER_RETRY_DELAY_MS,
  maxRedirects: DEFAULT_MAX_REDIRECTS,
  userAgent: DEFAULT_BROWSER_USER_AGENT,
  acceptLanguage: DEFAULT_ACCEPT_LANGUAGE,
  compression: DEFAULT_COMPRESSION,
  requestHeaders: {},
  maxPageSizeBytes: MAX_PAGE_SIZE_BYTES,
  supportedContentTypes: SUPPORTED_CONTENT_TYPES,
  config: {},
}

export function resolveBrowserProviderConfig(config: BrowserProviderConfig): ResolvedBrowserProviderConfig {
  const resolved: ResolvedBrowserProviderConfig = {
    ...DEFAULT_BROWSER_PROVIDER_CONFIG,
    ...config,
    requestHeaders: { ...DEFAULT_BROWSER_PROVIDER_CONFIG.requestHeaders, ...config.requestHeaders },
    config: { ...DEFAULT_BROWSER_PROVIDER_CONFIG.config, ...config.config },
  }
  validateBrowserProviderConfig(resolved)
  return resolved
}

export function validateBrowserProviderConfig(config: BrowserProviderConfig): void {
  if (!config.id?.trim()) throw new ValidationError('Browser provider ID is required')
  if (config.priority !== undefined && (config.priority < 0 || config.priority > 100)) {
    throw new ValidationError('Browser provider priority must be between 0 and 100')
  }
  if (config.timeoutMs !== undefined && (config.timeoutMs < 1_000 || config.timeoutMs > MAX_BROWSER_TIMEOUT_MS)) {
    throw new ValidationError(`Browser provider timeout must be between 1000 and ${MAX_BROWSER_TIMEOUT_MS}ms`)
  }
  for (const [name, value] of [
    ['retries', config.retries],
    ['retryDelayMs', config.retryDelayMs],
    ['maxRedirects', config.maxRedirects],
    ['maxPageSizeBytes', config.maxPageSizeBytes],
  ] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      throw new ValidationError(`${name} must be a non-negative integer`)
    }
  }
  if (config.maxPageSizeBytes === 0) throw new ValidationError('maxPageSizeBytes must be greater than zero')
  if (config.userAgent !== undefined && !config.userAgent.trim()) throw new ValidationError('userAgent cannot be empty')
  if (config.acceptLanguage !== undefined && !config.acceptLanguage.trim()) {
    throw new ValidationError('acceptLanguage cannot be empty')
  }
  if (config.supportedContentTypes !== undefined && config.supportedContentTypes.length === 0) {
    throw new ValidationError('supportedContentTypes cannot be empty')
  }
}

export type BrowserProviderConstructor = (
  config: BrowserProviderConfig,
) => BrowserProvider | Promise<BrowserProvider>

export class BrowserFactory {
  private constructors = new Map<string, BrowserProviderConstructor>()
  private instances = new Map<string, BrowserProvider>()
  private configs = new Map<string, BrowserProviderConfig>()

  register(providerId: string, constructor: BrowserProviderConstructor): void {
    if (this.constructors.has(providerId)) return
    this.constructors.set(providerId, constructor)
    logger.debug('Browser provider constructor registered', { provider: providerId })
  }

  async create(providerId: string, config?: BrowserProviderConfig): Promise<BrowserProvider> {
    const cached = this.instances.get(providerId)
    if (cached) return cached
    const constructor = this.constructors.get(providerId)
    if (!constructor) throw new ValidationError(`Browser provider '${providerId}' not found`)
    const finalConfig: BrowserProviderConfig = {
      ...this.configs.get(providerId),
      ...config,
      id: providerId,
    }
    validateBrowserProviderConfig(finalConfig)
    const instance = await constructor(finalConfig)
    this.instances.set(providerId, instance)
    return instance
  }

  async createMany(providerIds: string[], config?: BrowserProviderConfig): Promise<BrowserProvider[]> {
    return Promise.all(providerIds.map((id) => this.create(id, config)))
  }

  setConfig(providerId: string, config: BrowserProviderConfig): void {
    const normalized = { ...config, id: providerId }
    validateBrowserProviderConfig(normalized)
    this.configs.set(providerId, normalized)
    this.instances.delete(providerId)
  }

  getConfig(providerId: string): BrowserProviderConfig | undefined {
    return this.configs.get(providerId)
  }

  clearCache(): void {
    this.instances.clear()
  }

  clear(): void {
    this.constructors.clear()
    this.instances.clear()
    this.configs.clear()
  }
}

let globalFactory: BrowserFactory | null = null

export function getBrowserFactory(): BrowserFactory {
  globalFactory ??= new BrowserFactory()
  return globalFactory
}

export function resetBrowserFactory(): void {
  globalFactory = null
}
