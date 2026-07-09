import { eq, desc, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db/client'
import {
  researchSessions,
  researchSources,
  researchFollowups,
  type ResearchSession,
  type ResearchSource,
  type ResearchFollowup,
  type ResearchSessionStatus,
} from '@/lib/db/schema'

// ---------------------------------------------------------------------------
// Session CRUD
// ---------------------------------------------------------------------------

export async function createSession(input: {
  userId: string
  organizationId?: string
  title: string
  query: string
  status?: ResearchSessionStatus
}): Promise<ResearchSession> {
  const id = nanoid()
  const now = new Date()
  const [row] = await db
    .insert(researchSessions)
    .values({
      id,
      userId: input.userId,
      organizationId: input.organizationId ?? null,
      title: input.title,
      query: input.query,
      status: input.status ?? 'in-progress',
      sourceCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return row
}

export async function getSessions(userId: string): Promise<ResearchSession[]> {
  return db
    .select()
    .from(researchSessions)
    .where(eq(researchSessions.userId, userId))
    .orderBy(desc(researchSessions.createdAt))
}

export async function getSession(id: string, userId: string): Promise<ResearchSession | null> {
  const [row] = await db
    .select()
    .from(researchSessions)
    .where(and(eq(researchSessions.id, id), eq(researchSessions.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function updateSession(
  id: string,
  userId: string,
  patch: Partial<{
    title: string
    status: ResearchSessionStatus
    reportContent: string
    sourceCount: number
    confidenceScore: string
    organizationId: string
  }>,
): Promise<ResearchSession | null> {
  const [row] = await db
    .update(researchSessions)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(researchSessions.id, id), eq(researchSessions.userId, userId)))
    .returning()
  return row ?? null
}

export async function deleteSession(id: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(researchSessions)
    .where(and(eq(researchSessions.id, id), eq(researchSessions.userId, userId)))
    .returning({ id: researchSessions.id })
  return result.length > 0
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function getSources(sessionId: string): Promise<ResearchSource[]> {
  return db
    .select()
    .from(researchSources)
    .where(eq(researchSources.sessionId, sessionId))
    .orderBy(desc(researchSources.createdAt))
}

export async function addSource(input: {
  sessionId: string
  title: string
  url: string
  snippet?: string
  relevanceScore?: string
  sourceType?: string
}): Promise<ResearchSource> {
  const [row] = await db
    .insert(researchSources)
    .values({
      id: nanoid(),
      sessionId: input.sessionId,
      title: input.title,
      url: input.url,
      snippet: input.snippet ?? null,
      relevanceScore: input.relevanceScore ?? null,
      sourceType: input.sourceType ?? 'web',
      createdAt: new Date(),
    })
    .returning()
  return row
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export async function getFollowups(sessionId: string): Promise<ResearchFollowup[]> {
  return db
    .select()
    .from(researchFollowups)
    .where(eq(researchFollowups.sessionId, sessionId))
    .orderBy(desc(researchFollowups.createdAt))
}

export async function addFollowup(input: {
  sessionId: string
  question: string
  answer: string
}): Promise<ResearchFollowup> {
  const [row] = await db
    .insert(researchFollowups)
    .values({
      id: nanoid(),
      sessionId: input.sessionId,
      question: input.question,
      answer: input.answer,
      createdAt: new Date(),
    })
    .returning()
  return row
}
