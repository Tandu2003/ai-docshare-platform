import { apiClient } from '@/utils/api-client';
export interface DocumentAnalysisResult {
  title?: string;
  description?: string;
  tags?: string[];
  summary?: string;
  keyPoints?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  confidence?: number;
  // AI suggested category
  suggestedCategoryId?: string | null;
  suggestedCategoryName?: string | null;
  categoryConfidence?: number;
}
export interface AIAnalysisResponse {
  success: boolean;
  data: DocumentAnalysisResult;
  processedFiles: number;
  processingTime: number;
}

export interface AIAnalysisRequest {
  fileIds: string[];
}

export class AIService {
  static async analyzeDocument(request: AIAnalysisRequest): Promise<any> {
    try {
      // Validate request
      if (!request.fileIds || request.fileIds.length === 0) {
        throw new Error('No file IDs provided for analysis');
      }


      const response = await apiClient.post<AIAnalysisResponse>(
        '/ai/analyze-document',
        request,
      );

      if (response.success && response.data) {
        return response;
      }

      throw new Error(response.message || 'Failed to analyze document');
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to analyze document');
    }
  }

  static async getDocumentAnalysis(
    documentId: string,
  ): Promise<DocumentAnalysisResult | null> {
    try {
      const response = await apiClient.get(`/ai/analysis/${documentId}`);

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  static async testConnection(): Promise<{ gemini: boolean }> {
    try {
      const response = await apiClient.get<{ gemini: boolean }>(
        '/ai/test-connection',
      );

      if (response.success && response.data) {
        return response.data;
      }

      return { gemini: false };
    } catch (error) {
      return { gemini: false };
    }
  }

  static async getUserFilesForAnalysis(): Promise<{
    success: boolean;
    files: Array<{
      id: string;
      originalName: string;
      mimeType: string;
      fileSize: number;
      createdAt: string;
    }>;
    count: number;
    message: string;
  }> {
    try {
      const response = await apiClient.get('/ai/my-files');
      return response.data as {
        success: boolean;
        files: Array<{
          id: string;
          originalName: string;
          mimeType: string;
          fileSize: number;
          createdAt: string;
        }>;
        count: number;
        message: string;
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        count: 0,
        message: 'Failed to get user files',
      };
    }
  }

  static async searchUserFiles(fileName: string): Promise<{
    success: boolean;
    files: Array<{
      id: string;
      originalName: string;
      mimeType: string;
      fileSize: number;
      createdAt: string;
    }>;
    count: number;
    message: string;
  }> {
    try {
      const response = await apiClient.get(
        `/ai/my-files/search?fileName=${encodeURIComponent(fileName)}`,
      );
      return response.data as {
        success: boolean;
        files: Array<{
          id: string;
          originalName: string;
          mimeType: string;
          fileSize: number;
          createdAt: string;
        }>;
        count: number;
        message: string;
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        count: 0,
        message: 'Failed to search user files',
      };
    }
  }

  static formatAnalysisForDisplay(analysis: DocumentAnalysisResult): {
    title: string;
    description: string;
    tags: string[];
    summary: string;
    keyPoints: string[];
    difficulty: string;
    language: string;
    confidence: string;
  } {
    return {
      title: analysis.title || '',
      description: analysis.description || '',
      tags: analysis.tags || [],
      summary: analysis.summary || '',
      keyPoints: analysis.keyPoints || [],
      difficulty: analysis.difficulty || 'beginner',
      language: analysis.language || 'en',
      confidence: analysis.confidence
        ? `${Math.round(analysis.confidence * 100)}%`
        : '0%',
    };
  }

  static mergeWithUserInput(
    userInput: {
      title?: string;
      description?: string;
      tags?: string[];
      language?: string;
    },
    aiSuggestions: DocumentAnalysisResult,
  ): {
    title: string;
    description: string;
    tags: string[];
    language: string;
  } {
    return {
      title: userInput.title || aiSuggestions.title || 'Untitled Document',
      description: userInput.description || aiSuggestions.description || '',
      tags:
        userInput.tags && userInput.tags.length > 0
          ? userInput.tags
          : aiSuggestions.tags || [],
      language: userInput.language || aiSuggestions.language || 'en',
    };
  }

  static isHighConfidenceAnalysis(
    analysis: DocumentAnalysisResult,
    threshold: number = 0.7,
  ): boolean {
    return (analysis.confidence || 0) >= threshold;
  }

  static getSupportedFileTypes(): string[] {
    return [
      'pdf',
      'doc',
      'docx',
      'ppt',
      'pptx',
      'xls',
      'xlsx',
      'txt',
      'jpg',
      'jpeg',
      'png',
      'gif',
      'bmp',
      'webp',
    ];
  }

  static isFileTypeSupported(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return false;

    return this.getSupportedFileTypes().includes(extension);
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getVectorSearchInfo(): string {
    return 'Sử dụng AI Embeddings (768 dimensions) với text-embedding-004 model';
  }

  static isEmbeddingSupported(document: {
    aiAnalysis?: { summary?: string; keyPoints?: string[] };
  }): boolean {
    // Embedding is supported if document has AI analysis with content
    return !!(
      document.aiAnalysis &&
      (document.aiAnalysis.summary || document.aiAnalysis.keyPoints?.length)
    );
  }
}
