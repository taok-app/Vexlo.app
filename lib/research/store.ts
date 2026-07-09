/**
 * Zod request/response validation schemas for the Research API.
 * All persistence is handled by lib/db/repositories/research.ts.
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Re-export DB types so existing consumers keep their imports working
// ---------------------------------------------------------------------------
export type {
  ResearchSession,
  ResearchSource,
  ResearchFollowup,
  ResearchSessionStatus,
} from '@/lib/db/schema'

// ---------------------------------------------------------------------------
// Request validation schemas
// ---------------------------------------------------------------------------

export const createSessionSchema = z.object({
  title: z.string().trim().max(200).optional(),
  query: z.string().trim().min(1, 'Query is required').max(2000),
  organizationId: z.string().optional(),
})
export type CreateSessionInput = z.infer<typeof createSessionSchema>

export const followupSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(1000),
})
export type FollowupInput = z.infer<typeof followupSchema>

export const exportSchema = z.object({
  format: z.enum(['markdown', 'json']).default('markdown'),
})
export type ExportInput = z.infer<typeof exportSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse and validate a request body against a Zod schema. */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodSchema<T>,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const raw = await req.json()
    const result = schema.safeParse(raw)
    if (!result.success) {
      const message = result.error.issues.map((e: { message: string }) => e.message).join(', ')
      return { data: null, error: message }
    }
    return { data: result.data, error: null }
  } catch {
    return { data: null, error: 'Invalid JSON body' }
  }
}
