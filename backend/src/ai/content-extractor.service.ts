import { Injectable, Logger } from '@nestjs/common';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfParse from 'pdf-parse';

export interface ExtractedContent {
  text: string;
  metadata?: {
    pages?: number;
    words?: number;
    characters?: number;
  };
}

@Injectable()
export class ContentExtractorService {
  private readonly logger = new Logger(ContentExtractorService.name);

  /**
   * Extract text content from various file types
   */
  async extractContent(
    buffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<ExtractedContent> {
    try {
      switch (mimeType) {
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.extractWordContent(buffer);

        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          return this.extractExcelContent(buffer);

        case 'application/pdf':
          return await this.extractPdfContent(buffer);

        case 'text/plain':
          return this.extractTextContent(buffer);

        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        case 'application/vnd.ms-powerpoint':
          return this.extractPowerPointContent(buffer);

        default:
          // For unsupported file types, try to extract as text
          this.logger.warn(`Unsupported file type: ${mimeType}. Attempting text extraction.`);
          return this.extractTextContent(buffer);
      }
    } catch (error) {
      this.logger.error(`Failed to extract content from ${fileName}: ${error.message}`);
      throw new Error(`Failed to extract content from file: ${error.message}`);
    }
  }

  /**
   * Extract content from Word documents
   */
  private async extractWordContent(buffer: Buffer): Promise<ExtractedContent> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;

      return {
        text: text.trim(),
        metadata: {
          words: text.split(/\s+/).filter((word) => word.length > 0).length,
          characters: text.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to extract Word content: ${error.message}`);
    }
  }

  /**
   * Extract content from Excel files
   */
  private extractExcelContent(buffer: Buffer): ExtractedContent {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allText = '';

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        allText += `\n--- Sheet: ${sheetName} ---\n`;

        sheetData.forEach((row: any[]) => {
          if (row && row.length > 0) {
            const rowText = row
              .filter((cell) => cell !== undefined && cell !== null && cell !== '')
              .join(' | ');
            if (rowText.trim()) {
              allText += rowText + '\n';
            }
          }
        });
      });

      return {
        text: allText.trim(),
        metadata: {
          words: allText.split(/\s+/).filter((word) => word.length > 0).length,
          characters: allText.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to extract Excel content: ${error.message}`);
    }
  }

  /**
   * Extract content from PDF files
   */
  private async extractPdfContent(buffer: Buffer): Promise<ExtractedContent> {
    try {
      const data = await pdfParse(buffer);

      return {
        text: data.text.trim(),
        metadata: {
          pages: data.numpages,
          words: data.text.split(/\s+/).filter((word) => word.length > 0).length,
          characters: data.text.length,
        },
      };
    } catch (error) {
      throw new Error(`Failed to extract PDF content: ${error.message}`);
    }
  }

  /**
   * Extract content from text files
   */
  private extractTextContent(buffer: Buffer): ExtractedContent {
    const text = buffer.toString('utf-8');

    return {
      text: text.trim(),
      metadata: {
        words: text.split(/\s+/).filter((word) => word.length > 0).length,
        characters: text.length,
      },
    };
  }

  /**
   * Extract content from PowerPoint files (basic implementation)
   */
  private extractPowerPointContent(_buffer: Buffer): ExtractedContent {
    // For now, we'll return a placeholder since PowerPoint extraction is complex
    // You can enhance this later with libraries like node-pptx or officegen
    this.logger.warn('PowerPoint extraction not fully implemented. Returning placeholder.');

    return {
      text: 'PowerPoint file detected. Content extraction for PowerPoint files is not fully supported yet.',
      metadata: {
        words: 0,
        characters: 0,
      },
    };
  }

  /**
   * Check if file type is supported for content extraction
   */
  isSupportedFileType(mimeType: string): boolean {
    const supportedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
    ];

    return supportedTypes.includes(mimeType);
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return ['docx', 'doc', 'xlsx', 'xls', 'pdf', 'txt', 'pptx', 'ppt'];
  }
}
