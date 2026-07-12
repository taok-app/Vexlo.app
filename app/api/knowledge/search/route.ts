'use strict'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session/get-server-session'
import { knowledgeService } from '@/lib/knowledge'
import { z } from 'zod'

/**
 * POST /api/knowledge/search
 *
 * Search documents using hybrid (vector + keyword) search
 */

const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(1000),
  topK: z.number().int().min(1).max(100).optional().default(10),
  vectorWeight: z.number().min(0).max(1).optional(),
  keywordWeight: z.number().min(0).max(1).optional(),
  filters: z
    .object({
      documentId: z.union([z.string(), z.array(z.string())]).optional(),
      mimeType: z.union([z.string(), z.array(z.string())]).optional(),
      indexed: z.boolean().optional(),
    })
    .optional(),
})

type SearchRequest = z.infer<typeof searchRequestSchema>

const responseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      results: z.array(
        z.object({
          id: z.string(),
          content: z.string(),
          score: z.number(),
          confidence: z.number(),
          source: z.object({
            documentId: z.string(),
            documentTitle: z.string(),
            documentMimeType: z.string(),
          }),
        }),
      ),
      count: z.number(),
    })
    .optional(),
  error: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Verify session
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    // Parse and validate request
    const body = await request.json()
    let validated: SearchRequest
    try {
      validated = searchRequestSchema.parse(body)
    } catch (error) {
      const validationError = error instanceof z.ZodError ? error.errors[0]?.message : 'Invalid request'
      return NextResponse.json(
        { success: false, error: `Validation failed: ${validationError}` },
        { status: 422 },
      )
    }

    // Perform search
    const results = await knowledgeService.searchHybrid({
      q: validated.query,
      topK: validated.topK,
      vectorWeight: validated.vectorWeight,
      keywordWeight: validated.keywordWeight,
      filters: {
        ...validated.filters,
        userId: session.user.id,
      },
    })

    // Format response
    const response: z.infer<typeof responseSchema> = {
      success: true,
      data: {
        results: results.map((chunk) => ({
          id: chunk.id,
          content: chunk.content,
          score: chunk.score,
          confidence: chunk.confidence,
          source: chunk.source || {
            documentId: chunk.documentId,
            documentTitle: 'Unknown',
            documentMimeType: 'unknown',
          },
        })),
        count: results.length,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 },
    )
  }
}
