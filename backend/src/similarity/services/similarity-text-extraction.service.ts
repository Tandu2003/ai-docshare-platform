import { ContentExtractorService } from '../../ai/content-extractor.service';
import { CloudflareR2Service } from '../../common/cloudflare-r2.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SimilarityTextExtractionService {
  constructor(
    private readonly contentExtractor: ContentExtractorService,
    private readonly r2Service: CloudflareR2Service,
  ) {}
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
      } catch {
        // Failed to extract text from file
      }
    }

    return textContents.join('\n\n').trim();
  }

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
    } catch {
      // Failed to extract file content for embedding
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
