import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session/get-server-session'
import { exportSchema, parseBody } from '@/lib/research/store'
import * as service from '@/lib/research/service'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { data, error } = await parseBody(req, exportSchema)
  if (error) {
    return NextResponse.json({ error }, { status: 422 })
  }

  if (data!.format === 'json') {
    const result = await service.buildJsonReport(id, session.user.id)
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ report: result })
  }

  const result = await service.buildMarkdownReport(id, session.user.id)
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(result.markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  })
}
