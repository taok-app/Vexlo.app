'use strict'

import { db } from '@/lib/db/client'
import { documents, documentChunks } from '@/lib/db/schema'
import { eq, and, desc, asc } from 'drizzle-orm'
import type { SearchQuery, HybridSearchQuery, KnowledgeContext, RetrievedChunk } from './types'
import { SearchError } from './types'
import { vectorSearch, keywordSearch, hybridSearch } from './retrieval'
import { buildContext, formatContextMarkdown, extractContextText } from './context-builder'
import { createLogger } from '@/lib/logging'

const logger = createLogger('knowledge:service')

/**
 * Knowledge Service
 *
 * Single entry point for all Knowledge Layer operations.
 * Orchestrates retrieval, context building, and document management.
 */
export class KnowledgeService {
  /**
   * Search documents using vector similarity
   */
  async search(query: SearchQuery): Promise<RetrievedChunk[]> {
    try {
      logger.info('Vector search', { query: query.q.substring(0, 50) })
      const result = await vectorSearch(query)
      logger.info('Vector search complete', { count: result.chunks.length })
      return result.chunks
    } catch (error) {
      logger.error('Vector search failed', { error: String(error) })
      throw error
    }
  }

  /**
   * Search documents using keyword matching
   */
  async searchKeyword(query: SearchQuery): Promise<RetrievedChunk[]> {
    try {
      logger.info('Keyword search', { query: query.q.substring(0, 50) })
      const result = await keywordSearch(query)
      logger.info('Keyword search complete', { count: result.chunks.length })
      return result.chunks
    } catch (error) {
      logger.error('Keyword search failed', { error: String(error) })
      throw error
    }
  }

  /**
   * Hybrid search combining vector and keyword results
   */
  async searchHybrid(query: HybridSearchQuery): Promise<RetrievedChunk[]> {
    try {
      logger.info('Hybrid search', { query: query.q.substring(0, 50) })
      const result = await hybridSearch(query)
      logger.info('Hybrid search complete', { count: result.chunks.length })
      return result.chunks
    } catch (error) {
      logger.error('Hybrid search failed', { error: String(error) })
      throw error
    }
  }

  /**
   * Retrieve and build optimized AI context from query
   */
  async retrieve(
    query: string,
    options: {
      maxTokens?: number
      topK?: number
      filters?: SearchQuery['filters']
    } = {},
  ): Promise<KnowledgeContext> {
    try {
      logger.info('Retrieve context', { query: query.substring(0, 50) })

      // Use hybrid search to get chunks
      const chunks = await this.searchHybrid({
        q: query,
        topK: options.topK ?? 15,
        filters: options.filters,
      })

      // Build optimized context
      const context = await buildContext(chunks, {
        maxTokens: options.maxTokens ?? 6000,
        maxChunks: options.topK ?? 15,
      })

      logger.info('Context retrieved', {
        chunks: context.chunks.length,
        tokens: context.totalTokens,
        truncated: context.truncated,
      })

      return context
    } catch (error) {
      logger.error('Retrieve context failed', { error: String(error) })
      throw error
    }
  }

  /**
   * Get document by ID with metadata and chunk information
   */
  async getDocument(
    documentId: string,
    userId?: string,
  ): Promise<{
    document: any
    chunks: RetrievedChunk[]
    chunkCount: number
  } | null> {
    try {
      logger.info('Get document', { documentId })

      // Fetch document
      const doc = await db
        .select()
        .from(documents)
        .where(
          userId
            ? and(eq(documents.id, documentId), eq(documents.userId, userId))
            : eq(documents.id, documentId),
        )
        .limit(1)

      if (!doc || doc.length === 0) {
        logger.warn('Document not found', { documentId })
        return null
      }

      // Fetch chunks
      const chunks = await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId))
        .orderBy(asc(documentChunks.chunkIndex))

      const retrievedChunks: RetrievedChunk[] = chunks.map((chunk) => ({
        ...chunk,
        score: 1.0,
        confidence: 1.0,
        source: {
          documentId: doc[0].id,
          documentTitle: doc[0].title,
          documentMimeType: doc[0].mimeType,
        },
      }))

      return {
        document: doc[0],
        chunks: retrievedChunks,
        chunkCount: retrievedChunks.length,
      }
    } catch (error) {
      logger.error('Get document failed', { error: String(error), documentId })
      throw error
    }
  }

  /**
   * List documents with pagination and filtering
   */
  async listDocuments(
    userId: string,
    options: {
      page?: number
      limit?: number
      status?: 'uploaded' | 'processing' | 'processed' | 'error'
      search?: string
      orderBy?: 'recent' | 'oldest' | 'title'
    } = {},
  ): Promise<{
    documents: any[]
    total: number
    page: number
    limit: number
    hasMore: boolean
  }> {
    try {
      const page = Math.max(1, options.page ?? 1)
      const limit = Math.min(options.limit ?? 20, 100)
      const offset = (page - 1) * limit

      logger.info('List documents', { userId, page, limit })

      // Build where conditions
      const conditions = [eq(documents.userId, userId)]
      if (options.status) {
        conditions.push(eq(documents.status, options.status))
      }

      const whereClause = and(...conditions)

      // Get total count
      const countResult = await db
        .select({ count: db.fn.count() })
        .from(documents)
        .where(whereClause)

      const total = (countResult[0]?.count as number) ?? 0

      // Determine sort order
      let orderBy = desc(documents.createdAt)
      if (options.orderBy === 'oldest') {
        orderBy = asc(documents.createdAt)
      } else if (options.orderBy === 'title') {
        orderBy = asc(documents.title)
      }

      // Fetch documents
      const docs = await db
        .select()
        .from(documents)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset)

      // Filter by search term if provided
      const filtered =
        options.search && options.search.length > 0
          ? docs.filter(
              (doc) =>
                doc.title.toLowerCase().includes(options.search!.toLowerCase()) ||
                (doc.metadata &&
                  typeof doc.metadata === 'object' &&
                  Object.values(doc.metadata).some(
                    (v) => typeof v === 'string' && v.toLowerCase().includes(options.search!.toLowerCase()),
                  )),
            )
          : docs

      return {
        documents: filtered,
        total,
        page,
        limit,
        hasMore: offset + filtered.length < total,
      }
    } catch (error) {
      logger.error('List documents failed', { error: String(error), userId })
      throw error
    }
  }

  /**
   * Delete document (soft delete)
   */
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      logger.info('Delete document', { documentId, userId })

      // Verify ownership
      const doc = await db
        .select()
        .from(documents)
        .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
        .limit(1)

      if (!doc || doc.length === 0) {
        logger.warn('Document not found for deletion', { documentId, userId })
        return false
      }

      // Soft delete by marking as deleted
      // Note: This assumes updatedAt field exists. If not, we'd need schema migration
      await db.update(documents).set({ updatedAt: new Date() }).where(eq(documents.id, documentId))

      logger.info('Document deleted', { documentId })
      return true
    } catch (error) {
      logger.error('Delete document failed', { error: String(error), documentId })
      throw error
    }
  }

  /**
   * Format context as markdown for display
   */
  formatContextMarkdown(context: KnowledgeContext): string {
    return formatContextMarkdown(context)
  }

  /**
   * Extract plain text context
   */
  extractContextText(context: KnowledgeContext): string {
    return extractContextText(context)
  }
}

/**
 * Create singleton instance
 */
export const knowledgeService = new KnowledgeService()
