'use strict'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session/get-server-session'
import { knowledgeService } from '@/lib/knowledge'
import { z } from 'zod'

/**
 * GET /api/knowledge/documents/[id]
 *
 * Get document details with chunks
 */

const responseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      document: z.object({
        id: z.string(),
        title: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        status: z.enum(['uploaded', 'processing', 'processed', 'error']),
        chunkCount: z.number(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
      chunks: z.array(
        z.object({
          id: z.string(),
          chunkIndex: z.number(),
          content: z.string(),
          tokens: z.number().nullable(),
        }),
      ),
    })
    .optional(),
  error: z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Verify session
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const { id } = await params

    if (!id || id.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 },
      )
    }

    // Get document
    const result = await knowledgeService.getDocument(id, session.user.id)

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 },
      )
    }

    // Format response
    const response: z.infer<typeof responseSchema> = {
      success: true,
      data: {
        document: {
          id: result.document.id,
          title: result.document.title,
          mimeType: result.document.mimeType,
          fileSize: result.document.fileSize,
          status: result.document.status,
          chunkCount: result.chunkCount,
          createdAt: result.document.createdAt.toISOString(),
          updatedAt: result.document.updatedAt.toISOString(),
        },
        chunks: result.chunks.map((chunk) => ({
          id: chunk.id,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          tokens: chunk.tokens,
        })),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/knowledge/documents/[id]
 *
 * Delete document (soft delete)
 */

const deleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
})

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    // Verify session
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const { id } = await params

    if (!id || id.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID' },
        { status: 400 },
      )
    }

    // Delete document
    const deleted = await knowledgeService.deleteDocument(id, session.user.id)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 },
      )
    }

    const response: z.infer<typeof deleteResponseSchema> = {
      success: true,
      message: 'Document deleted successfully',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 },
    )
  }
}
