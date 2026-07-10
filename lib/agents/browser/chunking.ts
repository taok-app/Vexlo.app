/**
 * Document Chunking
 * 
 * Deterministic chunking of documents into processable units.
 */

import type { DocumentChunk, PageMetadata, ChunkingOptions } from './types'
import { estimateTokenCount, cleanWhitespace } from './utils'
import { nanoid } from 'nanoid'
import { DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP, MAX_CHUNKS_PER_DOCUMENT } from './constants'
import { createLogger } from '@/lib/logging'

const logger = createLogger('browser:chunking')

/**
 * Chunk a document into smaller pieces
 */
export function chunkDocument(
  content: string,
  sourceUrl: string,
  metadata: PageMetadata,
  options: Partial<ChunkingOptions> = {},
): DocumentChunk[] {
  const finalOptions: ChunkingOptions = {
    chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE,
    overlapSize: options.overlapSize ?? DEFAULT_CHUNK_OVERLAP,
    respectParagraphs: options.respectParagraphs ?? true,
    respectHeadings: options.respectHeadings ?? true,
  }

  const chunks: DocumentChunk[] = []
  let currentIndex = 0
  let chunkIndex = 0

  while (currentIndex < content.length && chunkIndex < MAX_CHUNKS_PER_DOCUMENT) {
    const chunkStart = Math.max(0, currentIndex - finalOptions.overlapSize)
    const chunkEnd = Math.min(content.length, currentIndex + finalOptions.chunkSize)

    let chunk = content.substring(chunkStart, chunkEnd)

    // Respect paragraph boundaries if enabled
    if (finalOptions.respectParagraphs) {
      chunk = trimToParagraphBoundary(chunk)
    }

    if (chunk.length > 0) {
      const documentChunk: DocumentChunk = {
        id: `chunk_${nanoid()}`,
        sourceUrl,
        index: chunkIndex,
        content: cleanWhitespace(chunk),
        estimatedTokens: estimateTokenCount(chunk),
        metadata,
      }

      chunks.push(documentChunk)
      chunkIndex++
      currentIndex = chunkEnd
    } else {
      // Skip empty chunks
      currentIndex += finalOptions.chunkSize
    }
  }

  logger.debug('Document chunked', {
    sourceUrl,
    chunkCount: chunks.length,
    contentLength: content.length,
  })

  return chunks
}

/**
 * Trim text to paragraph boundaries
 */
function trimToParagraphBoundary(text: string): string {
  // Find the last paragraph break
  const lastBreak = text.lastIndexOf('\n\n')
  if (lastBreak > 0 && lastBreak > text.length / 2) {
    return text.substring(0, lastBreak)
  }
  return text
}

/**
 * Merge chunks back into full document
 */
export function mergeChunks(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return ''

  // Sort by index
  const sorted = [...chunks].sort((a, b) => a.index - b.index)

  // Build full document, removing overlaps
  let result = sorted[0].content

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i].content
    const previous = sorted[i - 1].content

    // Find and remove overlap
    let overlapLength = 0
    const maxOverlapLength = Math.min(previous.length, current.length, 100)

    for (let j = 1; j <= maxOverlapLength; j++) {
      if (previous.endsWith(current.substring(0, j))) {
        overlapLength = j
      }
    }

    if (overlapLength > 0) {
      result += current.substring(overlapLength)
    } else {
      result += current
    }
  }

  return result
}
