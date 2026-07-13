import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session/get-server-session'
import { createSessionSchema, parseBody } from '@/lib/research/store'
import * as service from '@/lib/research/service'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessions = await service.listSessions(session.user.id)
  return NextResponse.json({ sessions })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await parseBody(req, createSessionSchema)
    if (error) {
      return NextResponse.json({ error }, { status: 422 })
    }

    const created = await service.createSession({
      userId: session.user.id,
      organizationId: data!.organizationId,
      title: data!.title,
      query: data!.query,
    })

    return NextResponse.json({ session: created }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
