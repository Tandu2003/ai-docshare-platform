import { Injectable } from '@nestjs/common';
import * as mammoth from 'mammoth';
import * as pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';

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
  async extractContent(
    buffer: Buffer,
    mimeType: string,
    _fileName: string, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<ExtractedContent> {
    try {
      switch (mimeType) {
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractWordContent(buffer);

        case 'application/msword':
          // Old .doc format - mammoth only supports .docx
          // Check if it might actually be a .docx with wrong mime type
          if (this.isDocxFile(buffer)) {
            return await this.extractWordContent(buffer);
          }
          return {
            text: '',
            metadata: {
              words: 0,
              characters: 0,
            },
          };

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
          return this.extractTextContent(buffer);
      }
    } catch (error) {
      throw new Error(
        `Failed to extract content from file: ${(error as Error).message}`,
      );
    }
  }

  private async extractWordContent(buffer: Buffer): Promise<ExtractedContent> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;

      return {
        text: text.trim(),
        metadata: {
          words: text.split(/\s+/).filter(word => word.length > 0).length,
          characters: text.length,
        },
      };
    } catch (_error) {
      throw new Error(
        `Failed to extract Word content: ${(_error as Error).message}`,
      );
    }
  }

  private extractExcelContent(buffer: Buffer): ExtractedContent {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let allText = '';

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
        });

        allText += `\n--- Sheet: ${sheetName} ---\n`;

        sheetData.forEach((row: any[]) => {
          if (row && row.length > 0) {
            const rowText = row
              .filter(
                cell => cell !== undefined && cell !== null && cell !== '',
              )
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
          words: allText.split(/\s+/).filter(word => word.length > 0).length,
          characters: allText.length,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to extract Excel content: ${(error as Error).message}`,
      );
    }
  }

  private async extractPdfContent(buffer: Buffer): Promise<ExtractedContent> {
    try {
      const data = await pdfParse(buffer);

      return {
        text: data.text.trim(),
        metadata: {
          pages: data.numpages,
          words: data.text.split(/\s+/).filter(word => word.length > 0).length,
          characters: data.text.length,
        },
      };
    } catch (error) {
      // Common PDF parsing errors - return empty content instead of throwing
      const errorMsg = (error as Error).message?.toLowerCase() || '';
      if (
        errorMsg.includes('invalid') ||
        errorMsg.includes('corrupted') ||
        errorMsg.includes('pages dictionary')
      ) {
        return {
          text: '',
          metadata: {
            pages: 0,
            words: 0,
            characters: 0,
          },
        };
      }
      throw new Error(
        `Failed to extract PDF content: ${(error as Error).message}`,
      );
    }
  }

  private extractTextContent(buffer: Buffer): ExtractedContent {
    const text = buffer.toString('utf-8');

    return {
      text: text.trim(),
      metadata: {
        words: text.split(/\s+/).filter(word => word.length > 0).length,
        characters: text.length,
      },
    };
  }

  private extractPowerPointContent(buffer: Buffer): ExtractedContent {
    void buffer;
    // For now, we'll return a placeholder since PowerPoint extraction is complex
    // You can enhance this later with libraries like node-pptx or officegen

    return {
      text: 'PowerPoint file detected. Content extraction for PowerPoint files is not fully supported yet.',
      metadata: {
        words: 0,
        characters: 0,
      },
    };
  }

  private isDocxFile(buffer: Buffer): boolean {
    // DOCX files are ZIP archives starting with PK signature
    // and contain specific XML files
    if (buffer.length < 4) return false;
    // Check for ZIP signature (PK\x03\x04)
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

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

  getSupportedExtensions(): string[] {
    return ['docx', 'doc', 'xlsx', 'xls', 'pdf', 'txt', 'pptx', 'ppt'];
  }
}
