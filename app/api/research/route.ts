import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { researchStore } from '@/lib/research/store'

// Re-export types from the store so consumers can import them from here
export type { ResearchStatus, ResearchSource, ResearchSession } from '@/lib/research/store'

export async function GET() {
  const list = Array.from(researchStore.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  return NextResponse.json({ sessions: list })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, query, tags = [] } = body

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  const id = nanoid()
  const now = new Date().toISOString()

  const session = {
    id,
    title: title?.trim() || query.trim().slice(0, 80),
    query: query.trim(),
    status: 'in-progress' as const,
    createdAt: now,
    updatedAt: now,
    sources: [],
    tags,
  }

  researchStore.set(id, session)
  return NextResponse.json({ session }, { status: 201 })
}
