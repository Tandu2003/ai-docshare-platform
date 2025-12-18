import { Injectable, Logger } from '@nestjs/common';

/** Options for chunking text */
interface ChunkingOptions {
  readonly chunkSize?: number;
  readonly overlap?: number;
  readonly preserveSentences?: boolean;
}

/** A chunk of text with position information */
interface Chunk {
  readonly text: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly chunkIndex: number;
}

/** Default chunking configuration */
const DEFAULT_CHUNK_SIZE = 5000;
const DEFAULT_OVERLAP = 500;
const CHUNKING_THRESHOLD = 10000;

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  /**
   * Determine if text should be chunked based on length threshold.
   * @param text The text to check
   * @param threshold Optional custom threshold (default: 10000)
   */
  shouldChunk(text: string, threshold = CHUNKING_THRESHOLD): boolean {
    return text.length > threshold;
  }

  /**
   * Split text into overlapping chunks.
   * If text is shorter than threshold, returns single chunk.
   */
  chunk(text: string, options: ChunkingOptions = {}): Chunk[] {
    const {
      chunkSize = DEFAULT_CHUNK_SIZE,
      overlap = DEFAULT_OVERLAP,
      preserveSentences = true,
    } = options;
    if (!this.shouldChunk(text)) {
      return [
        {
          text,
          startIndex: 0,
          endIndex: text.length,
          chunkIndex: 0,
        },
      ];
    }
    const chunks: Chunk[] = [];
    let startIndex = 0;
    let chunkIndex = 0;
    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + chunkSize, text.length);
      if (preserveSentences && endIndex < text.length) {
        const boundaryIndex = this.findSentenceBoundary(text, endIndex);
        if (boundaryIndex > startIndex) {
          endIndex = boundaryIndex;
        }
      }
      const chunkText = text.substring(startIndex, endIndex);
      chunks.push({
        text: chunkText,
        startIndex,
        endIndex,
        chunkIndex,
      });
      if (endIndex >= text.length) break;
      startIndex = Math.max(startIndex + 1, endIndex - overlap);
      chunkIndex++;
    }
    return chunks;
  }

  /**
   * Find the nearest sentence boundary before the given position.
   * Looks for sentence-ending punctuation followed by space or end of text.
   */
  findSentenceBoundary(text: string, position: number): number {
    const searchStart = Math.max(0, position - 200);
    const searchEnd = Math.min(text.length, position + 100);
    const searchText = text.substring(searchStart, searchEnd);
    const sentenceEnders = /[.!?。！？]\s+/g;
    let lastMatch = -1;
    let match: RegExpExecArray | null;
    while ((match = sentenceEnders.exec(searchText)) !== null) {
      const absolutePos = searchStart + match.index + match[0].length;
      if (absolutePos <= position + 50) {
        lastMatch = absolutePos;
      }
    }
    if (lastMatch > 0) {
      return lastMatch;
    }
    return position;
  }

  /** Get the chunking threshold constant */
  getChunkingThreshold(): number {
    return CHUNKING_THRESHOLD;
  }

  /** Get the default chunk size */
  getDefaultChunkSize(): number {
    return DEFAULT_CHUNK_SIZE;
  }

  /** Get the default overlap */
  getDefaultOverlap(): number {
    return DEFAULT_OVERLAP;
  }
}
