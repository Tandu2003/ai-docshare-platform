import { EMBEDDING_TEXT_LIMITS } from '../constants/search-similarity.constants';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Document data required for embedding text generation
 */
export interface DocumentForEmbedding {
  title: string;
  description?: string | null;
  tags?: string[];
  aiAnalysis?: {
    summary?: string | null;
    keyPoints?: string[] | null;
  } | null;
}

/**
 * Extended document data with file content
 */
export interface DocumentWithContentForEmbedding extends DocumentForEmbedding {
  fileContent?: string | null;
}

/**
 * Options for building embedding text
 */
export interface EmbeddingTextOptions {
  /** Include file content in embedding (for similarity detection) */
  includeFileContent?: boolean;
  /** Maximum file content characters */
  maxFileContentChars?: number;
  /** Maximum total characters */
  maxTotalChars?: number;
}

/**
 * Unified Embedding Text Builder Service
 *
 * This service provides a single, consistent way to build text content
 * for embedding generation across the application.
 *
 * IMPORTANT: Both search and similarity detection should use this service
 * to ensure embeddings are generated consistently.
 */
@Injectable()
export class EmbeddingTextBuilderService {
  private readonly logger = new Logger(EmbeddingTextBuilderService.name);

  /**
   * Build text content for embedding generation.
   *
   * Priority for content selection:
   * 1. AI analysis summary (if available)
   * 2. Document description
   * 3. Title + tags (fallback)
   *
   * Always includes: title + main content + tags + key points (if available)
   *
   * @param document - Document data
   * @param options - Build options
   * @returns Combined text for embedding generation
   */
  buildEmbeddingText(
    document: DocumentWithContentForEmbedding,
    options: EmbeddingTextOptions = {},
  ): string {
    const {
      includeFileContent = false,
      maxFileContentChars = EMBEDDING_TEXT_LIMITS.MAX_FILE_CONTENT_CHARS,
      maxTotalChars = EMBEDDING_TEXT_LIMITS.MAX_TOTAL_CHARS,
    } = options;

    const parts: string[] = [];

    // Always start with title (highest importance)
    if (document.title) {
      parts.push(document.title);
    }

    // Add main content based on priority
    const mainContent = this.selectMainContent(document);
    if (mainContent) {
      parts.push(mainContent);
    }

    // Add file content if requested (for similarity detection)
    if (includeFileContent && document.fileContent) {
      const truncatedContent = document.fileContent.substring(
        0,
        maxFileContentChars,
      );
      parts.push(truncatedContent);
    }

    // Add key points if available
    if (
      document.aiAnalysis?.keyPoints &&
      document.aiAnalysis.keyPoints.length > 0
    ) {
      parts.push(document.aiAnalysis.keyPoints.join(' '));
    }

    // Always end with tags (for context)
    if (document.tags && document.tags.length > 0) {
      parts.push(document.tags.join(' '));
    }

    // Join and truncate to max length
    const combinedText = parts.filter(Boolean).join(' ').trim();
    return combinedText.substring(0, maxTotalChars);
  }

  /**
   * Build text for search embedding (without file content).
   * Use this for document search functionality.
   */
  buildSearchEmbeddingText(document: DocumentForEmbedding): string {
    return this.buildEmbeddingText(document, {
      includeFileContent: false,
    });
  }

  /**
   * Build text for similarity detection embedding (with file content).
   * Use this for document similarity detection.
   */
  buildSimilarityEmbeddingText(
    document: DocumentWithContentForEmbedding,
  ): string {
    return this.buildEmbeddingText(document, {
      includeFileContent: true,
    });
  }

  /**
   * Select the main content for embedding based on priority.
   *
   * Priority:
   * 1. AI analysis summary (most concise and relevant)
   * 2. Description (user-provided)
   * 3. Empty string (will rely on title + tags)
   */
  private selectMainContent(document: DocumentForEmbedding): string {
    // Priority 1: AI analysis summary
    if (document.aiAnalysis?.summary) {
      return document.aiAnalysis.summary;
    }

    // Priority 2: Description
    if (document.description) {
      return document.description;
    }

    // Fallback: No additional main content (title + tags will be used)
    return '';
  }

  /**
   * Validate if document has sufficient content for embedding.
   */
  hasValidContent(document: DocumentForEmbedding): boolean {
    const text = this.buildSearchEmbeddingText(document);
    return text.trim().length > 0;
  }

  /**
   * Build metadata-only embedding text (when no file content available).
   * Used as fallback when file extraction fails.
   */
  buildMetadataOnlyText(document: DocumentForEmbedding): string {
    const parts: string[] = [];

    if (document.title) {
      parts.push(document.title);
    }

    if (document.description) {
      parts.push(document.description);
    }

    if (document.tags && document.tags.length > 0) {
      parts.push(document.tags.join(' '));
    }

    if (document.aiAnalysis?.summary) {
      parts.push(document.aiAnalysis.summary);
    }

    if (
      document.aiAnalysis?.keyPoints &&
      document.aiAnalysis.keyPoints.length > 0
    ) {
      parts.push(document.aiAnalysis.keyPoints.join(' '));
    }

    return parts.filter(Boolean).join(' ').trim();
  }
}
