'use strict'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/session/get-server-session'
import { knowledgeService } from '@/lib/knowledge'
import { z } from 'zod'

/**
 * POST /api/knowledge/retrieve
 *
 * Retrieve and build optimized context for AI systems
 */

const retrieveRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000),
  maxTokens: z.number().int().min(100).max(20000).optional().default(6000),
  topK: z.number().int().min(1).max(50).optional().default(10),
  filters: z
    .object({
      documentId: z.union([z.string(), z.array(z.string())]).optional(),
      mimeType: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .optional(),
})

type RetrieveRequest = z.infer<typeof retrieveRequestSchema>

const responseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      context: z.string(),
      markdown: z.string(),
      sources: z.array(
        z.object({
          documentId: z.string(),
          documentTitle: z.string(),
          chunks: z.number(),
        }),
      ),
      metadata: z.object({
        totalChunks: z.number(),
        totalTokens: z.number(),
        maxTokens: z.number(),
        truncated: z.boolean(),
      }),
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
    let validated: RetrieveRequest
    try {
      validated = retrieveRequestSchema.parse(body)
    } catch (error) {
      const validationError = error instanceof z.ZodError ? error.errors[0]?.message : 'Invalid request'
      return NextResponse.json(
        { success: false, error: `Validation failed: ${validationError}` },
        { status: 422 },
      )
    }

    // Retrieve context
    const context = await knowledgeService.retrieve(validated.query, {
      maxTokens: validated.maxTokens,
      topK: validated.topK,
      filters: {
        ...validated.filters,
        userId: session.user.id,
      },
    })

    // Format response
    const textContext = knowledgeService.extractContextText(context)
    const markdownContext = knowledgeService.formatContextMarkdown(context)

    const response: z.infer<typeof responseSchema> = {
      success: true,
      data: {
        context: textContext,
        markdown: markdownContext,
        sources: context.sources,
        metadata: {
          totalChunks: context.chunks.length,
          totalTokens: context.totalTokens,
          maxTokens: context.maxTokens,
          truncated: context.truncated,
        },
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Retrieve error:', error)
    return NextResponse.json(
      { success: false, error: 'Retrieve failed' },
      { status: 500 },
    )
  }
}
