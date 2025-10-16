import { FilesService } from '../files/files.service';
import { ContentExtractorService } from './content-extractor.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface DocumentAnalysisResult {
  title?: string;
  description?: string;
  tags?: string[];
  summary?: string;
  keyPoints?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  confidence?: number;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private filesService: FilesService,
    private contentExtractor: ContentExtractorService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY not found in environment variables');
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Analyze document content from file URLs and generate metadata
   */
  async analyzeDocumentFromFiles(
    fileUrls: string[],
  ): Promise<DocumentAnalysisResult> {
    try {
      this.logger.log(`Analyzing ${fileUrls.length} files with Gemini`);

      const modelName =
        this.configService.get<string>('GEMINI_MODEL_NAME') || 'gemini-pro';
      this.logger.log(`Using Gemini model: ${modelName}`);
      const model = this.genAI.getGenerativeModel({ model: modelName });

      // Extract content from files instead of sending files directly
      const extractedContents = await Promise.all(
        fileUrls.map(async url => {
          try {
            // Get file data from URL
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch file: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType =
              response.headers.get('content-type') ||
              'application/octet-stream';

            // Extract filename from URL for logging
            const fileName = url.split('/').pop() || 'unknown';

            // Extract text content from file
            const extractedContent = await this.contentExtractor.extractContent(
              buffer,
              mimeType,
              fileName,
            );

            this.logger.log(
              `Extracted ${extractedContent.metadata?.words || 0} words from ${fileName}`,
            );

            return {
              fileName,
              content: extractedContent.text,
              metadata: extractedContent.metadata,
            };
          } catch (error) {
            this.logger.error(`Error processing file ${url}:`, error);
            return null;
          }
        }),
      );

      // Filter out failed file processing
      const validContents = extractedContents.filter(
        content => content !== null,
      );

      if (validContents.length === 0) {
        throw new BadRequestException(
          'Không có tệp hợp lệ nào có thể được xử lý',
        );
      }

      // Create prompt with extracted content
      const prompt = this.createAnalysisPromptWithContent(validContents);

      // Generate content with text prompt only
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      this.logger.log('Gemini analysis completed successfully');

      return this.parseAnalysisResult(text);
    } catch (error) {
      this.logger.error('Error analyzing document with Gemini:', error);
      throw new BadRequestException(
        `Failed to analyze document: ${error.message}`,
      );
    }
  }

  /**
   * Create analysis prompt with extracted content
   */
  private createAnalysisPromptWithContent(
    contents: Array<{
      fileName: string;
      content: string;
      metadata?: any;
    }>,
  ): string {
    const documentsText = contents
      .map((content, index) => {
        return `
--- Document ${index + 1}: ${content.fileName} ---
${content.content}
`;
      })
      .join('\n');

    return `
Analyze the following document(s) and extract the following information in JSON format.

IMPORTANT LANGUAGE REQUIREMENT:
- You must respond in Vietnamese (tiếng Việt) only
- All text fields (title, description, summary, keyPoints, tags) must be written in Vietnamese
- Set the field \"language\" strictly to \"vi\"

${documentsText}

Please provide the analysis in this exact JSON format:

{
  "title": "A clear, descriptive title for the document(s) (max 100 characters)",
  "description": "A comprehensive description of the document content (max 500 characters)",
  "tags": ["relevant", "keywords", "topics", "max 10 tags"],
  "summary": "A detailed summary of the main content (max 1000 characters)",
  "keyPoints": ["important", "key", "points", "from", "document"],
  "difficulty": "beginner|intermediate|advanced",
  "language": "en|vi|other",
  "confidence": 0.95
}

Instructions:
1. Generate a meaningful Vietnamese title that captures the main topic
2. Write a clear Vietnamese description explaining the document content
3. Extract relevant Vietnamese tags/keywords for searching
4. Provide a comprehensive Vietnamese summary of the content
5. List the most important key points in Vietnamese
6. Assess the difficulty level based on content complexity
7. Set the primary language to \"vi\"
8. Provide a confidence score (0-1) for the analysis

Please analyze all provided document content and provide a consolidated response in valid JSON format only. Do not include any other text outside the JSON.
`;
  }

  /**
   * Create analysis prompt for Gemini
   */
  private createAnalysisPrompt(): string {
    return `
Analyze the provided document(s) and extract the following information in JSON format.

IMPORTANT LANGUAGE REQUIREMENT:
- You must respond in Vietnamese (tiếng Việt) only
- All text fields (title, description, summary, keyPoints, tags) must be written in Vietnamese
- Set the field \"language\" strictly to \"vi\"

{
  "title": "A clear, descriptive title for the document (max 100 characters)",
  "description": "A comprehensive description of the document content (max 500 characters)",
  "tags": ["relevant", "keywords", "topics", "max 10 tags"],
  "summary": "A detailed summary of the main content (max 1000 characters)",
  "keyPoints": ["important", "key", "points", "from", "document"],
  "difficulty": "beginner|intermediate|advanced",
  "language": "en|vi|other",
  "confidence": 0.95
}

Instructions:
1. Generate a meaningful Vietnamese title that captures the main topic
2. Write a clear Vietnamese description explaining the document content
3. Extract relevant Vietnamese tags/keywords for searching
4. Provide a comprehensive Vietnamese summary of the content
5. List the most important key points in Vietnamese
6. Assess the difficulty level based on content complexity
7. Set the primary language to \"vi\"
8. Provide a confidence score (0-1) for the analysis

Please analyze all provided files and provide a consolidated response in valid JSON format only. Do not include any other text outside the JSON.
`;
  }

  /**
   * Parse Gemini response to extract structured data
   */
  private parseAnalysisResult(text: string): DocumentAnalysisResult {
    try {
      // Clean the response text to extract JSON
      const cleanedText = text.trim();
      let jsonText = cleanedText;

      // Try to extract JSON if it's wrapped in markdown or other text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonText);

      // Validate and sanitize the result
      return {
        title: this.sanitizeString(parsed.title, 100),
        description: this.sanitizeString(parsed.description, 500),
        tags: Array.isArray(parsed.tags)
          ? parsed.tags
              .slice(0, 10)
              .map((tag: string) => this.sanitizeString(tag, 50))
          : [],
        summary: this.sanitizeString(parsed.summary, 1000),
        keyPoints: Array.isArray(parsed.keyPoints)
          ? parsed.keyPoints
              .slice(0, 10)
              .map((point: string) => this.sanitizeString(point, 200))
          : [],
        difficulty: ['beginner', 'intermediate', 'advanced'].includes(
          parsed.difficulty,
        )
          ? parsed.difficulty
          : 'beginner',
        language: this.sanitizeString(parsed.language, 10) || 'vi',
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.max(0, Math.min(1, parsed.confidence))
            : 0.8,
      };
    } catch (error) {
      this.logger.error('Error parsing Gemini response:', error);
      this.logger.debug('Raw response:', text);

      // Return fallback result in Vietnamese
      return {
        title: 'Phân tích tài liệu',
        description:
          'Tài liệu đã được xử lý nhưng không thể hoàn tất phân tích.',
        tags: ['tài liệu'],
        summary: 'Chưa có kết quả phân tích',
        keyPoints: [],
        difficulty: 'beginner',
        language: 'vi',
        confidence: 0.3,
      };
    }
  }

  /**
   * Sanitize string fields
   */
  private sanitizeString(value: any, maxLength: number): string {
    if (typeof value !== 'string') return '';
    return value.trim().substring(0, maxLength);
  }

  /**
   * Test Gemini connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const modelName =
        this.configService.get<string>('GEMINI_MODEL_NAME') || 'gemini-pro';
      this.logger.log(`Testing connection with Gemini model: ${modelName}`);
      const model = this.genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(
        'Say "Hello" if you can read this.',
      );
      const response = result.response;
      const text = response.text();

      this.logger.log('Gemini connection test successful');
      return text.toLowerCase().includes('hello');
    } catch (error) {
      this.logger.error('Gemini connection test failed:', error);
      return false;
    }
  }
}
