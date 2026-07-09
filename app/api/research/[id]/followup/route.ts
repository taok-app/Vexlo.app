import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session/get-server-session'
import { followupSchema, parseBody } from '@/lib/research/store'
import * as service from '@/lib/research/service'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { data, error } = await parseBody(req, followupSchema)
  if (error) {
    return NextResponse.json({ error }, { status: 422 })
  }

  const result = await service.submitFollowup(id, session.user.id, data!.question)
  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    question: result.followup.question,
    answer: result.followup.answer,
    session: result.session,
  })
}
