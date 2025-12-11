import { CloudflareR2Service } from '../common/cloudflare-r2.service';
import { FilesService } from '../files/files.service';
import { ContentExtractorService } from './content-extractor.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BadRequestException, Injectable } from '@nestjs/common';
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
  // AI-estimated reliability/trustworthiness of the document content (0-100)
  reliabilityScore?: number;
  // Enhanced moderation fields
  moderationScore?: number; // 0-100 score for content safety
  safetyFlags?: string[]; // List of detected safety issues
  isSafe?: boolean; // Overall safety assessment
  recommendedAction?: 'approve' | 'review' | 'reject'; // AI recommendation
}

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor(
    private configService: ConfigService,
    private filesService: FilesService,
    private contentExtractor: ContentExtractorService,
    private r2Service: CloudflareR2Service,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async analyzeDocumentFromFiles(
    fileUrls: string[],
  ): Promise<DocumentAnalysisResult> {
    try {
      const modelName =
        this.configService.get<string>('GEMINI_MODEL_NAME') || 'gemini-pro';
      const model = this.genAI.getGenerativeModel({ model: modelName });

      // Timeout config (default 60s for content extraction, 30s for Gemini)
      const extractionTimeout = parseInt(
        this.configService.get<string>('AI_EXTRACTION_TIMEOUT') || '60000',
        10,
      );
      const geminiTimeout = parseInt(
        this.configService.get<string>('AI_GEMINI_TIMEOUT') || '30000',
        10,
      );

      // Extract content from files with timeout
      const extractedContents = await Promise.all(
        fileUrls.map(async url => {
          const maxRetries = 2; // Giảm retry để nhanh hơn
          const fileName = url.split('/').pop()?.split('?')[0] || 'unknown';

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              // Get file stream with timeout (url is already storageUrl from database)
              const fileStreamPromise = this.r2Service.getFileStream(url);
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error('File stream timeout')),
                  extractionTimeout / 2,
                ),
              );

              const fileStream = (await Promise.race([
                fileStreamPromise,
                timeoutPromise,
              ])) as any;

              // Convert stream to buffer with size limit (10MB max)
              const chunks: Buffer[] = [];
              let totalSize = 0;
              const maxSize = 10 * 1024 * 1024; // 10MB

              for await (const chunk of fileStream) {
                totalSize += chunk.length;
                if (totalSize > maxSize) {
                  break;
                }
                chunks.push(chunk);
              }
              const buffer = Buffer.concat(chunks);

              // Get mimeType from extension
              const fileExtension =
                fileName.split('.').pop()?.toLowerCase() || '';
              const mimeTypeMap: Record<string, string> = {
                pdf: 'application/pdf',
                doc: 'application/msword',
                docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                xls: 'application/vnd.ms-excel',
                xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                ppt: 'application/vnd.ms-powerpoint',
                pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                txt: 'text/plain',
                md: 'text/markdown',
              };
              const mimeType =
                mimeTypeMap[fileExtension] || 'application/octet-stream';

              // Extract text content with timeout
              const extractPromise = this.contentExtractor.extractContent(
                buffer,
                mimeType,
                fileName,
              );
              const extractTimeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error('Content extraction timeout')),
                  extractionTimeout / 2,
                ),
              );

              const extractedContent = await Promise.race([
                extractPromise,
                extractTimeoutPromise,
              ]);

              return {
                fileName,
                content: extractedContent.text,
                metadata: extractedContent.metadata,
              };
            } catch (error) {
              const isRetryable =
                (error as Error).message?.includes('network') ||
                (error as Error).message?.includes('ECONNRESET') ||
                (error as Error).message?.includes('ETIMEDOUT') ||
                (error as Error).message?.includes('timeout');

              if (attempt < maxRetries && isRetryable) {
                const retryDelay = 2000;
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                continue;
              }

              break;
            }
          }

          return null;
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
      const prompt = this.createAnalysisPromptWithContent(
        validContents as {
          fileName: string;
          content: string;
          metadata?: {
            pages?: number;
            words?: number;
            characters?: number;
          };
        }[],
      );

      // Generate content with timeout
      const generatePromise = model.generateContent(prompt);
      const geminiTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`Gemini API timeout after ${geminiTimeout}ms`)),
          geminiTimeout,
        ),
      );

      const result = (await Promise.race([
        generatePromise,
        geminiTimeoutPromise,
      ])) as any;
      const response = result.response;
      const text = response.text();

      return this.parseAnalysisResult(text);
    } catch (error) {
      throw new BadRequestException(
        `Failed to analyze document: ${(error as Error).message}`,
      );
    }
  }

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
  - Set the field "language" strictly to "vi"

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
    "confidence": 0.95,
    "reliabilityScore": 85,
    "moderationScore": 85,
    "safetyFlags": [],
    "isSafe": true,
    "recommendedAction": "approve|review|reject"
  }

  CONTENT SAFETY ANALYSIS REQUIREMENTS:
  You must thoroughly analyze the content for safety and appropriateness. Check for:

  1. VIOLENCE & HARM:
    - Graphic violence, gore, or disturbing imagery
    - Instructions for violence or self-harm
    - Threats or intimidation

  2. HATE SPEECH & DISCRIMINATION:
    - Content targeting specific groups based on race, religion, gender, etc.
    - Derogatory language or slurs
    - Incitement to discrimination

  3. TERRORIST & EXTREMIST CONTENT:
    - Instructions for making weapons or explosives
    - Terrorist propaganda or recruitment material
    - Extremist ideologies or manifestos

  4. INAPPROPRIATE SEXUAL CONTENT:
    - Pornographic or sexually explicit material
    - Sexual content involving minors
    - Non-consensual sexual content

  5. ILLEGAL ACTIVITIES:
    - Instructions for illegal activities
    - Drug manufacturing or distribution guides
    - Fraud or scam instructions

  6. MISINFORMATION & CONSPIRACY:
    - Dangerous medical misinformation
    - Conspiracy theories that could cause harm
    - False information about elections or public safety

  IMPORTANT: All safety flags must be written in Vietnamese (tiếng Việt). Use these Vietnamese terms:
  - "Bạo lực" for violence
  - "Đe dọa" for threats
  - "Khủng bố" for terrorism
  - "Kích động bạo lực" for incitement to violence
  - "Hoạt động bất hợp pháp" for illegal activities
  - "Nội dung khiêu dâm" for sexual content
  - "Thông tin sai lệch" for misinformation
  - "Nội dung thù hận" for hate speech

  SCORING SYSTEM:
  - moderationScore: 0-100 (0 = extremely dangerous, 100 = completely safe)
  - safetyFlags: Array of detected issues (empty if safe)
  - isSafe: true if moderationScore >= 70, false otherwise
  - confidence: 0-1 (how confident AI is about the analysis - should correlate with moderationScore)
  - reliabilityScore: 0-100 (AI's estimate of the document's reliability/accuracy/credibility)
  - recommendedAction:
    - "approve": moderationScore >= 80 AND no critical safety flags
    - "review": moderationScore 50-79 OR minor safety concerns
    - "reject": moderationScore < 50 OR critical safety flags present

  IMPORTANT CONFIDENCE LOGIC:
  - High moderationScore (80-100) + High confidence (0.8-1.0) = Safe content, AI is confident
  - Medium moderationScore (50-79) + Medium confidence (0.5-0.8) = Uncertain content, AI is somewhat confident
  - Low moderationScore (0-49) + High confidence (0.8-1.0) = Dangerous content, AI is confident it's dangerous
  - Low moderationScore (0-49) + Low confidence (0.0-0.5) = AI is uncertain about dangerous content

  Instructions:
  1. Generate a meaningful Vietnamese title that captures the main topic
  2. Write a clear Vietnamese description explaining the document content
  3. Extract relevant Vietnamese tags/keywords for searching
  4. Provide a comprehensive Vietnamese summary of the content
  5. List the most important key points in Vietnamese
  6. Assess the difficulty level based on content complexity
  7. Set the primary language to "vi"
  8. Provide a confidence score (0-1) for the analysis (how sure the AI is)
  9. Provide a reliabilityScore (0-100) estimating how reliable/trustworthy the document content is
  10. CRITICAL: Perform thorough content safety analysis and scoring
  11. Flag any inappropriate, harmful, or dangerous content IN VIETNAMESE
  12. Provide clear recommendation for moderation action
  13. IMPORTANT: All safety flags must be in Vietnamese, not English

  Please analyze all provided document content and provide a consolidated response in valid JSON format only. Do not include any other text outside the JSON.
  `;
  }

  private createAnalysisPrompt(): string {
    return `
  Analyze the provided document(s) and extract the following information in JSON format.

  IMPORTANT LANGUAGE REQUIREMENT:
  - You must respond in Vietnamese (tiếng Việt) only
  - All text fields (title, description, summary, keyPoints, tags) must be written in Vietnamese
  - Set the field "language" strictly to "vi"

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
  7. Set the primary language to "vi"
  8. Provide a confidence score (0-1) for the analysis

  Please analyze all provided files and provide a consolidated response in valid JSON format only. Do not include any other text outside the JSON.
  `;
  }

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
      const moderationScore =
        typeof parsed.moderationScore === 'number'
          ? Math.max(0, Math.min(100, parsed.moderationScore))
          : 50; // Default to review if not provided

      const safetyFlags = Array.isArray(parsed.safetyFlags)
        ? parsed.safetyFlags
            .slice(0, 10)
            .map((flag: string) => this.sanitizeString(flag, 100))
        : [];

      const isSafe = parsed.isSafe === true || moderationScore >= 70;

      // Validate confidence based on moderation score
      let validatedConfidence = parsed.confidence || 0.5;
      if (moderationScore < 30 && validatedConfidence > 0.8) {
        // If content is very dangerous but confidence is very high, adjust confidence
        validatedConfidence = Math.min(validatedConfidence, 0.7);
      } else if (moderationScore > 80 && validatedConfidence < 0.5) {
        // If content is very safe but confidence is very low, adjust confidence
        validatedConfidence = Math.max(validatedConfidence, 0.6);
      }

      const recommendedAction = ['approve', 'review', 'reject'].includes(
        parsed.recommendedAction,
      )
        ? parsed.recommendedAction
        : moderationScore >= 80
          ? 'approve'
          : moderationScore >= 50
            ? 'review'
            : 'reject';

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
          typeof validatedConfidence === 'number'
            ? Math.max(0, Math.min(1, validatedConfidence))
            : 0.5,
        reliabilityScore:
          typeof parsed.reliabilityScore === 'number'
            ? Math.max(0, Math.min(100, parsed.reliabilityScore))
            : 0,
        // Enhanced moderation fields
        moderationScore,
        safetyFlags,
        isSafe,
        recommendedAction,
      };
    } catch {
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
        // Enhanced moderation fields with conservative defaults
        moderationScore: 30, // Low score for unknown content
        safetyFlags: ['Không thể phân tích nội dung'],
        isSafe: false,
        recommendedAction: 'review',
      };
    }
  }

  private sanitizeString(value: any, maxLength: number): string {
    if (typeof value !== 'string') return '';
    return value.trim().substring(0, maxLength);
  }

  async testConnection(): Promise<boolean> {
    try {
      const modelName =
        this.configService.get<string>('GEMINI_MODEL_NAME') || 'gemini-pro';
      const model = this.genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(
        'Say "Hello" if you can read this.',
      );
      const response = result.response;
      const text = response.text();

      return text.toLowerCase().includes('hello');
    } catch {
      return false;
    }
  }
}
