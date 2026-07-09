/**
 * Singleton in-memory research store.
 * Uses globalThis to share a single Map instance across all Next.js route
 * module instances in the dev server (which isolates modules per route).
 *
 * Replace with a real database (e.g. Neon + Drizzle) in production.
 */

export type ResearchStatus = 'in-progress' | 'completed' | 'failed'

export type ResearchSource = {
  id: string
  title: string
  url: string
}

export type ResearchSession = {
  id: string
  title: string
  query: string
  status: ResearchStatus
  createdAt: string
  updatedAt: string
  sources: ResearchSource[]
  summary?: string
  tags: string[]
}

declare global {
  // eslint-disable-next-line no-var
  var __researchStore: Map<string, ResearchSession> | undefined
}

function createInitialStore(): Map<string, ResearchSession> {
  const store = new Map<string, ResearchSession>()

  const now = Date.now()
  store.set('demo-1', {
    id: 'demo-1',
    title: 'AI-assisted testing strategies',
    query: 'How can AI improve software testing workflows?',
    status: 'completed',
    createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
    sources: [
      { id: 's1', title: 'Testing React Applications', url: 'https://testing-library.com' },
      { id: 's2', title: 'Jest Documentation', url: 'https://jestjs.io' },
      { id: 's3', title: 'AI Testing Tools Survey 2025', url: 'https://example.com/survey' },
    ],
    summary:
      'AI-assisted testing can reduce test authoring time by up to 70% through intelligent test generation, smart selectors, and self-healing test scripts. Key tools include Testim, Mabl, and Playwright AI. The most impactful area is visual regression testing where AI models can detect unintended UI changes that rule-based systems miss.',
    tags: ['AI', 'testing', 'automation'],
  })

  store.set('demo-2', {
    id: 'demo-2',
    title: 'Vercel Sandbox architecture',
    query: 'How does Vercel Sandbox work under the hood?',
    status: 'in-progress',
    createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 30).toISOString(),
    sources: [{ id: 's4', title: 'Vercel Platform Docs', url: 'https://vercel.com/docs' }],
    summary: undefined,
    tags: ['vercel', 'infrastructure'],
  })

  store.set('demo-3', {
    id: 'demo-3',
    title: 'Next.js 16 cache components',
    query: 'What are cache components in Next.js 16?',
    status: 'completed',
    createdAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
    updatedAt: new Date(now - 1000 * 60 * 60 * 47).toISOString(),
    sources: [
      { id: 's5', title: 'Next.js 16 Release Notes', url: 'https://nextjs.org/blog' },
      { id: 's6', title: 'Cache Components RFC', url: 'https://github.com/vercel/next.js' },
    ],
    summary:
      'Cache Components in Next.js 16 introduce the "use cache" directive enabling fine-grained caching at the component and function level. The compiler automatically generates cache keys. Works alongside revalidateTag() and the new updateTag() API for targeted invalidation.',
    tags: ['nextjs', 'performance', 'caching'],
  })

  return store
}

// Persist across hot-reloads and route module re-instantiation in dev
export const researchStore: Map<string, ResearchSession> =
  globalThis.__researchStore ?? (globalThis.__researchStore = createInitialStore())
