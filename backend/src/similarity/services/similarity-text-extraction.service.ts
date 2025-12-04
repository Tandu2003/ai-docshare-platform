/**
 * Similarity Text Extraction Service
 *
 * Handles text extraction for similarity comparison:
 * - Extract text from document files
 * - Extract text for embedding generation
 */

import { ContentExtractorService } from '../../ai/content-extractor.service';
import { CloudflareR2Service } from '../../common/cloudflare-r2.service';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SimilarityTextExtractionService {
  private readonly logger = new Logger(SimilarityTextExtractionService.name);

  constructor(
    private readonly contentExtractor: ContentExtractorService,
    private readonly r2Service: CloudflareR2Service,
  ) {}

  /**
   * Extract text content from files
   * @param limitText - If true, limit text length to prevent memory issues
   */
  async extractTextFromFiles(
    files: any[],
    limitText: boolean = false,
  ): Promise<string> {
    const textContents: string[] = [];
    const MAX_TEXT_LENGTH = limitText ? 5000 : 50000;

    for (const file of files) {
      try {
        if (limitText && files.length > 5) {
          break;
        }

        const fileStream = await this.r2Service.getFileStream(file.storageUrl);

        const chunks: Buffer[] = [];
        let totalSize = 0;
        const MAX_FILE_SIZE = limitText ? 5 * 1024 * 1024 : 50 * 1024 * 1024;

        for await (const chunk of fileStream) {
          totalSize += chunk.length;
          if (totalSize > MAX_FILE_SIZE) {
            this.logger.warn(
              `File ${file.fileName} too large, skipping full extraction`,
            );
            break;
          }
          chunks.push(chunk);
        }

        if (chunks.length === 0) continue;

        const buffer = Buffer.concat(chunks);
        const extracted = await this.contentExtractor.extractContent(
          buffer,
          file.mimeType,
          file.fileName,
        );

        const text = limitText
          ? extracted.text.substring(0, MAX_TEXT_LENGTH)
          : extracted.text;
        textContents.push(text);
      } catch (error) {
        this.logger.warn(
          `Failed to extract text from file ${file.id || file.fileName}: ${error.message}`,
        );
      }
    }

    return textContents.join('\n\n').trim();
  }

  /**
   * Extract text for embedding - improved to use actual file content
   */
  async extractTextForEmbedding(document: any): Promise<string> {
    const parts: string[] = [];

    if (document.title) {
      parts.push(document.title);
    }

    if (document.description) {
      parts.push(document.description);
    }

    try {
      if (document.files && document.files.length > 0) {
        const fileText = await this.extractTextFromFiles(
          document.files.map((f: any) => f.file),
        );
        if (fileText) {
          parts.push(fileText.substring(0, 5000));
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to extract file content for embedding: ${error.message}`,
      );
    }

    if (document.aiAnalysis?.summary) {
      parts.push(document.aiAnalysis.summary);
    }

    if (document.aiAnalysis?.keyPoints?.length > 0) {
      parts.push(document.aiAnalysis.keyPoints.join(' '));
    }

    if (document.tags?.length > 0) {
      parts.push(document.tags.join(' '));
    }

    return parts.join(' ').trim();
  }
}
