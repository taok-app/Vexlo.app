'use strict'

/**
 * Knowledge Layer
 *
 * Provides document management, retrieval, and context building for AI systems.
 */

export { knowledgeService, KnowledgeService } from './service'
export { buildContext, compressContext, formatContextMarkdown, extractContextText } from './context-builder'
export * from './retrieval'
export * from './types'
