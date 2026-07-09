/**
 * Research service layer.
 * All business logic lives here. Route handlers only orchestrate.
 * Designed to support future AI SDK integration without refactoring:
 * swap the mock implementations below for real AI providers.
 */

import * as repo from '@/lib/db/repositories/research'
import type { ResearchSession, ResearchSource, ResearchFollowup } from '@/lib/db/schema'

// ---------------------------------------------------------------------------
// TASK 7: Streaming support interfaces
// Architecture is forward-compatible — swap mock impls for real AI providers.
// ---------------------------------------------------------------------------

export interface ResearchPlanner {
  plan(query: string): Promise<string[]>
}

export interface ResearchSearcher {
  search(query: string): Promise<Array<{ title: string; url: string; snippet: string }>>
}

export interface ResearchReasoner {
  reason(context: string, question: string): Promise<string>
}

export interface ResearchCitationExtractor {
  extract(content: string): Promise<Array<{ title: string; url: string }>>
}

export interface ResearchReporter {
  generate(session: ResearchSession, sources: ResearchSource[]): Promise<string>
}

// Mock implementations — replace with AI SDK providers when ready
const planner: ResearchPlanner = {
  async plan(query) {
    return [`Analyze: ${query}`, 'Gather sources', 'Synthesize findings', 'Generate report']
  },
}

const searcher: ResearchSearcher = {
  async search(query) {
    return [
      {
        title: `Overview: ${query.slice(0, 60)}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: `Comprehensive analysis of "${query}" covering key aspects and recent developments.`,
      },
    ]
  },
}

const reasoner: ResearchReasoner = {
  async reason(_context, question) {
    const q = question.toLowerCase()
    if (q.includes('how') || q.includes('why')) {
      return `The underlying mechanisms involve a multi-layered approach where each factor builds on the previous one, balancing both technical and process-oriented elements.`
    }
    if (q.includes('what')) {
      return `The primary components encompass both technical and process-oriented elements. Real-world applications show measurable improvements when these are combined systematically.`
    }
    if (q.includes('compare') || q.includes('difference') || q.includes('limit')) {
      return `The key distinction lies in implementation complexity versus long-term maintainability. Current approaches favor modularity for larger teams, though context-dependent constraints always apply.`
    }
    return `Key considerations involve analyzing existing data, cross-referencing known patterns, and drawing connections to related topics in the field.`
  },
}

// ---------------------------------------------------------------------------
// Session operations
// ---------------------------------------------------------------------------

export async function listSessions(userId: string): Promise<ResearchSession[]> {
  return repo.getSessions(userId)
}

export async function createSession(input: {
  userId: string
  organizationId?: string
  title?: string
  query: string
}): Promise<ResearchSession> {
  const title = input.title?.trim() || input.query.trim().slice(0, 80)
  const session = await repo.createSession({
    userId: input.userId,
    organizationId: input.organizationId,
    title,
    query: input.query.trim(),
    status: 'in-progress',
  })

  // Kick off async source gathering (fire-and-forget for now)
  void enrichSession(session.id, session.userId, session.query)

  return session
}

export async function getSession(
  id: string,
  userId: string,
): Promise<{ session: ResearchSession; sources: ResearchSource[]; followups: ResearchFollowup[] } | null> {
  const session = await repo.getSession(id, userId)
  if (!session) return null
  const [sources, followups] = await Promise.all([repo.getSources(id), repo.getFollowups(id)])
  return { session, sources, followups }
}

export async function removeSession(id: string, userId: string): Promise<boolean> {
  return repo.deleteSession(id, userId)
}

// ---------------------------------------------------------------------------
// Enrichment (mock AI pipeline — replace with AI SDK streaming)
// ---------------------------------------------------------------------------

async function enrichSession(id: string, userId: string, query: string): Promise<void> {
  try {
    const steps = await planner.plan(query)
    const results = await Promise.all(steps.slice(0, 3).map((step) => searcher.search(step)))
    const sources = results.flat()

    await Promise.all(
      sources.map((s) =>
        repo.addSource({
          sessionId: id,
          title: s.title,
          url: s.url,
          snippet: s.snippet,
          sourceType: 'web',
        }),
      ),
    )

    await repo.updateSession(id, userId, {
      status: 'completed',
      sourceCount: sources.length,
    })
  } catch {
    await repo.updateSession(id, userId, { status: 'failed' })
  }
}

// ---------------------------------------------------------------------------
// Follow-up
// ---------------------------------------------------------------------------

export async function submitFollowup(
  id: string,
  userId: string,
  question: string,
): Promise<{ followup: ResearchFollowup; session: ResearchSession } | null> {
  const session = await repo.getSession(id, userId)
  if (!session) return null

  const answer = await reasoner.reason(session.query, question)

  const [followup] = await Promise.all([
    repo.addFollowup({ sessionId: id, question, answer }),
    repo.addSource({
      sessionId: id,
      title: `Follow-up: ${question.slice(0, 60)}`,
      url: `https://example.com/research/${id}/followup`,
      sourceType: 'followup',
    }),
    repo.updateSession(id, userId, {
      sourceCount: session.sourceCount + 1,
    }),
  ])

  const updated = await repo.getSession(id, userId)
  return { followup, session: updated! }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function buildMarkdownReport(
  id: string,
  userId: string,
): Promise<{ markdown: string; filename: string } | null> {
  const result = await getSession(id, userId)
  if (!result) return null
  const { session, sources, followups } = result

  const lines: string[] = [
    `# ${session.title}`,
    '',
    `**Query:** ${session.query}`,
    `**Status:** ${session.status}`,
    `**Created:** ${session.createdAt.toLocaleString()}`,
    `**Updated:** ${session.updatedAt.toLocaleString()}`,
  ]

  if (sources.length > 0) {
    lines.push('', '## Sources', '')
    sources.forEach((s) => lines.push(`- [${s.title}](${s.url})`))
  }

  if (followups.length > 0) {
    lines.push('', '## Follow-up Q&A', '')
    followups.forEach((f) => {
      lines.push(`**Q:** ${f.question}`, '', `**A:** ${f.answer}`, '')
    })
  }

  const filename = `${session.title.replace(/[^a-z0-9\-]/gi, '_')}.md`
  return { markdown: lines.join('\n'), filename }
}

export async function buildJsonReport(id: string, userId: string) {
  return getSession(id, userId)
}
