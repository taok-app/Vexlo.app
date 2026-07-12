'use strict'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session/get-server-session'
import { knowledgeService } from '@/lib/knowledge'
import { z } from 'zod'

/**
 * GET /api/knowledge/documents
 *
 * List documents with pagination and filtering
 */

const listQuerySchema = z.object({
  page: z.string().transform((v) => parseInt(v, 10)).optional(),
  limit: z.string().transform((v) => parseInt(v, 10)).optional(),
  status: z.enum(['uploaded', 'processing', 'processed', 'error']).optional(),
  search: z.string().optional(),
  orderBy: z.enum(['recent', 'oldest', 'title']).optional(),
})

type ListQuery = z.infer<typeof listQuerySchema>

const responseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      documents: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          mimeType: z.string(),
          fileSize: z.number(),
          status: z.enum(['uploaded', 'processing', 'processed', 'error']),
          chunkCount: z.number().nullable(),
          createdAt: z.string(),
          updatedAt: z.string(),
        }),
      ),
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        hasMore: z.boolean(),
      }),
    })
    .optional(),
  error: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    // Verify session
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    // Parse query parameters
    const searchParams = new URL(request.url).searchParams
    const query = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
      status: searchParams.get('status') as any,
      search: searchParams.get('search') || undefined,
      orderBy: searchParams.get('orderBy') as any,
    }

    let validated: ListQuery
    try {
      validated = listQuerySchema.parse(query)
    } catch (error) {
      const validationError = error instanceof z.ZodError ? error.errors[0]?.message : 'Invalid query'
      return NextResponse.json(
        { success: false, error: `Validation failed: ${validationError}` },
        { status: 422 },
      )
    }

    // List documents
    const result = await knowledgeService.listDocuments(session.user.id, validated)

    // Format response
    const response: z.infer<typeof responseSchema> = {
      success: true,
      data: {
        documents: result.documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          status: doc.status,
          chunkCount: doc.chunkCount,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        })),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasMore: result.hasMore,
        },
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json(
      { success: false, error: 'List failed' },
      { status: 500 },
    )
  }
}
