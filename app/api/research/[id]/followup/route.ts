import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { researchStore } from '@/lib/research/store'

type Params = { params: Promise<{ id: string }> }

function generateAnswer(question: string, sessionTitle: string): string {
  const q = question.toLowerCase()
  if (q.includes('how') || q.includes('why')) {
    return `In the context of "${sessionTitle}", this can be explained by examining the underlying mechanisms. The research suggests a multi-layered approach where each factor builds on the previous one, with particular attention to both technical and process-oriented elements.`
  }
  if (q.includes('what')) {
    return `"${sessionTitle}" points to several key findings: the primary components identified include both technical and process-oriented elements. Real-world applications show measurable improvements when these are combined systematically with proper tooling and team buy-in.`
  }
  if (q.includes('compare') || q.includes('difference') || q.includes('vs') || q.includes('limit')) {
    return `Analyzing this in the context of "${sessionTitle}" reveals nuanced trade-offs. The primary distinction lies in implementation complexity versus long-term maintainability. Current research favors the more modular approach for teams larger than 5 engineers, though context-dependent constraints always apply.`
  }
  return `Based on the research in "${sessionTitle}", the key considerations involve analyzing the existing data, cross-referencing with known patterns, and drawing connections to related topics in the field. Further investigation into the specific variables would strengthen these conclusions.`
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = researchStore.get(id)
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { question } = body

  if (!question?.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  const answer = generateAnswer(question, session.title)

  // Add a new source to the session reflecting the follow-up
  const newSource = {
    id: nanoid(),
    title: `Follow-up: ${question.slice(0, 60)}`,
    url: `https://example.com/research/${id}/followup`,
  }

  const updated = {
    ...session,
    sources: [...session.sources, newSource],
    updatedAt: new Date().toISOString(),
  }
  researchStore.set(id, updated)

  return NextResponse.json({ question, answer, session: updated })
}
