import { NextRequest, NextResponse } from 'next/server'
import { researchStore } from '@/lib/research/store'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = researchStore.get(id)
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const format: 'markdown' | 'json' = body.format ?? 'markdown'

  if (format === 'json') {
    return NextResponse.json({ report: session })
  }

  // Build a Markdown report
  const lines: string[] = [
    `# ${session.title}`,
    '',
    `**Query:** ${session.query}`,
    `**Status:** ${session.status}`,
    `**Created:** ${new Date(session.createdAt).toLocaleString()}`,
    `**Updated:** ${new Date(session.updatedAt).toLocaleString()}`,
  ]

  if (session.tags.length > 0) {
    lines.push(`**Tags:** ${session.tags.join(', ')}`)
  }

  if (session.summary) {
    lines.push('', '## Summary', '', session.summary)
  }

  if (session.sources.length > 0) {
    lines.push('', '## Sources', '')
    session.sources.forEach((src) => {
      lines.push(`- [${src.title}](${src.url})`)
    })
  }

  const markdown = lines.join('\n')

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${session.title.replace(/[^a-z0-9\-]/gi, '_')}.md"`,
    },
  })
}
