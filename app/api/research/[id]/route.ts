import { NextRequest, NextResponse } from 'next/server'
import { researchStore } from '@/lib/research/store'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const session = researchStore.get(id)
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ session })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  if (!researchStore.has(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  researchStore.delete(id)
  return NextResponse.json({ success: true })
}
