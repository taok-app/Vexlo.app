import { createLogger } from '@/lib/logging'
import { TtlCache } from './cache'
import type { ResearchPageFetcher, RobotsPolicy } from './types'

const logger = createLogger('research-browser-robots')

interface RobotsRule {
  allow: boolean
  path: string
}

interface RobotsGroup {
  agents: string[]
  rules: RobotsRule[]
}

export function parseRobotsTxt(value: string): RobotsGroup[] {
  const groups: RobotsGroup[] = []
  let current: RobotsGroup | undefined
  let rulesStarted = false
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.replace(/\s*#.*$/, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const key = line.slice(0, separator).trim().toLocaleLowerCase()
    const content = line.slice(separator + 1).trim()
    if (key === 'user-agent') {
      if (!current || rulesStarted) {
        current = { agents: [], rules: [] }
        groups.push(current)
        rulesStarted = false
      }
      current.agents.push(content.toLocaleLowerCase())
    } else if ((key === 'allow' || key === 'disallow') && current) {
      rulesStarted = true
      if (content) current.rules.push({ allow: key === 'allow', path: content })
    }
  }
  return groups
}

function matches(path: string, pattern: string): boolean {
  const anchored = pattern.endsWith('$')
  const raw = anchored ? pattern.slice(0, -1) : pattern
  const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')
  return new RegExp(`^${escaped}${anchored ? '$' : ''}`).test(path)
}

export function isPathAllowed(groups: RobotsGroup[], path: string, userAgent: string): boolean {
  const agent = userAgent.toLocaleLowerCase()
  const exact = groups.filter((group) => group.agents.some((value) => value !== '*' && agent.includes(value)))
  const applicable = exact.length > 0 ? exact : groups.filter((group) => group.agents.includes('*'))
  const matching = applicable.flatMap((group) => group.rules).filter((rule) => matches(path, rule.path))
  if (matching.length === 0) return true
  matching.sort((left, right) => right.path.length - left.path.length || Number(right.allow) - Number(left.allow))
  return matching[0]?.allow ?? true
}

export class RobotsTxtPolicy implements RobotsPolicy {
  private readonly cache: TtlCache<RobotsGroup[]>

  constructor(
    private readonly fetcher: ResearchPageFetcher,
    options: { ttlMs?: number } = {},
  ) {
    this.cache = new TtlCache({ defaultTtlMs: options.ttlMs ?? 24 * 60 * 60 * 1_000 })
  }

  async isAllowed(value: string, userAgent = 'VexloBrowser'): Promise<boolean> {
    const url = new URL(value)
    const robotsUrl = `${url.origin}/robots.txt`
    let groups = this.cache.get(robotsUrl)
    if (!groups) {
      try {
        const document = await this.fetcher.fetch(robotsUrl)
        groups = parseRobotsTxt(document.html)
        this.cache.set(robotsUrl, groups)
      } catch (error) {
        logger.warn('Robots policy unavailable; allowing fetch', {
          origin: url.origin,
          error: error instanceof Error ? error.message : 'Unknown robots error',
        })
        return true
      }
    }
    return isPathAllowed(groups, `${url.pathname}${url.search}`, userAgent)
  }
}
