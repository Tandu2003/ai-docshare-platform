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
  /**
   * Analyze documents using AI to generate metadata
   */
  static async analyzeDocument(request: AIAnalysisRequest): Promise<any> {
    try {
      // Validate request
      if (!request.fileIds || request.fileIds.length === 0) {
        throw new Error('No file IDs provided for analysis');
      }

      console.log('Analyzing files with IDs:', request.fileIds);

      const response = await apiClient.post<AIAnalysisResponse>(
        '/ai/analyze-document',
        request,
      );

      if (response.success && response.data) {
        return response;
      }

      throw new Error(response.message || 'Failed to analyze document');
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error instanceof Error
        ? error
        : new Error('Failed to analyze document');
    }
  }

  /**
   * Get AI analysis for a document
   */
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
      console.error('Error getting document analysis:', error);
      return null;
    }
  }

  /**
   * Test AI service connection
   */
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
      console.error('Error testing AI connection:', error);
      return { gemini: false };
    }
  }

  /**
   * Get user's files that can be analyzed
   */
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
      console.error('Error getting user files:', error);
      return {
        success: false,
        files: [],
        count: 0,
        message: 'Failed to get user files',
      };
    }
  }

  /**
   * Search user's files by name
   */
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
      console.error('Error searching user files:', error);
      return {
        success: false,
        files: [],
        count: 0,
        message: 'Failed to search user files',
      };
    }
  }

  /**
   * Format AI analysis data for display
   */
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

  /**
   * Merge user input with AI suggestions
   */
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

  /**
   * Validate AI analysis confidence
   */
  static isHighConfidenceAnalysis(
    analysis: DocumentAnalysisResult,
    threshold: number = 0.7,
  ): boolean {
    return (analysis.confidence || 0) >= threshold;
  }

  /**
   * Extract file extensions from file names
   */
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

  /**
   * Check if file type is supported by AI analysis
   */
  static isFileTypeSupported(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension) return false;

    return this.getSupportedFileTypes().includes(extension);
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
