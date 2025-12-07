import { apiClient } from '@/utils/api-client';

export interface DocumentPreview {
  id: string;
  documentId: string;
  pageNumber: number;
  previewUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
  variants?: {
    small: string;
    medium: string;
    large: string;
  };
  metadata?: {
    pageCount: number;
    processingTimeMs: number;
    previewSizes: string[];
    sourceType: 'PDF' | 'DOCX' | 'PPTX' | 'IMAGE' | 'TEXT';
    textPreviewPath?: string;
  };
}

export interface PreviewsResponse {
  documentId: string;
  previews: DocumentPreview[];
  count: number;
  expiresIn: number; // seconds
}

export interface PreviewPageResponse {
  url: string;
  expiresAt: string;
  mimeType: string;
}

export interface PreviewStatus {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
  previewCount: number;
  metadata?: {
    pageCount: number;
    processingTimeMs: number;
    previewSizes: string[];
    sourceType: 'PDF' | 'DOCX' | 'PPTX' | 'IMAGE' | 'TEXT';
    textPreviewPath?: string;
  };
}

export interface SecureDownloadResponse {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  expiresAt: string;
  message: string;
}

export interface DownloadTokenResponse {
  token: string;
  expiresAt: string;
  message: string;
}

export interface AccessCheckResponse {
  allowed: boolean;
  accessType?: 'owner' | 'public' | 'share_link' | 'admin';
  reason?: string;
  level: 'preview' | 'download' | 'full';
}

/**
 * Preview Service - handles document preview images and secure document access
 */
export class PreviewService {
  /**
   * Get preview images for a document
   * Returns short-lived signed URLs (30 seconds)
   */
  static async getDocumentPreviews(
    documentId: string,
    apiKey?: string,
  ): Promise<PreviewsResponse> {
    const response = await apiClient.get<PreviewsResponse>(
      `/preview/${documentId}`,
      { params: apiKey ? { apiKey } : undefined },
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể lấy preview');
    }

    return response.data;
  }

  /**
   * Get a specific preview page image URL
   */
  static async getPreviewPage(
    documentId: string,
    pageNumber: number,
    apiKey?: string,
  ): Promise<PreviewPageResponse> {
    const response = await apiClient.get<PreviewPageResponse>(
      `/preview/${documentId}/page/${pageNumber}`,
      { params: apiKey ? { apiKey } : undefined },
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể lấy preview page');
    }

    return response.data;
  }

  /**
   * Get preview generation status
   */
  static async getPreviewStatus(documentId: string): Promise<PreviewStatus> {
    const response = await apiClient.get<PreviewStatus>(
      `/preview/${documentId}/status`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể lấy trạng thái preview');
    }

    return response.data;
  }

  /**
   * Trigger preview generation (owner only)
   */
  static async generatePreviews(documentId: string): Promise<void> {
    const response = await apiClient.post(`/preview/${documentId}/generate`);

    if (!response.success) {
      throw new Error(response.message || 'Không thể tạo preview');
    }
  }

  /**
   * Regenerate previews (owner only)
   */
  static async regeneratePreviews(documentId: string): Promise<void> {
    const response = await apiClient.post(`/preview/${documentId}/regenerate`);

    if (!response.success) {
      throw new Error(response.message || 'Không thể tạo lại preview');
    }
  }

  /**
   * Get secure download URL (30 second expiry)
   * Must be used immediately after receiving
   */
  static async getSecureDownloadUrl(
    documentId: string,
    apiKey?: string,
  ): Promise<SecureDownloadResponse> {
    const response = await apiClient.post<SecureDownloadResponse>(
      `/secure/download/${documentId}`,
      {},
      { params: apiKey ? { apiKey } : undefined },
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể tạo liên kết tải xuống');
    }

    return response.data;
  }

  /**
   * Generate download token (30 second expiry)
   */
  static async generateDownloadToken(
    documentId: string,
  ): Promise<DownloadTokenResponse> {
    const response = await apiClient.post<DownloadTokenResponse>(
      `/secure/token/${documentId}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể tạo token tải xuống');
    }

    return response.data;
  }

  /**
   * Check document access permissions
   */
  static async checkAccess(
    documentId: string,
    level: 'preview' | 'download' | 'full' = 'preview',
    apiKey?: string,
  ): Promise<AccessCheckResponse> {
    const response = await apiClient.get<AccessCheckResponse>(
      `/secure/access/${documentId}`,
      { params: { level, ...(apiKey ? { apiKey } : {}) } },
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể kiểm tra quyền truy cập');
    }

    return response.data;
  }

  /**
   * Download document using secure URL
   * Opens download in new tab or triggers browser download
   */
  static async downloadSecurely(
    documentId: string,
    fileName?: string,
    apiKey?: string,
  ): Promise<{ success: boolean; fileName: string }> {
    try {
      // Get secure download URL
      const downloadInfo = await this.getSecureDownloadUrl(documentId, apiKey);

      // Trigger download using the short-lived URL
      const link = document.createElement('a');
      link.href = downloadInfo.url;
      link.download = fileName || downloadInfo.fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true, fileName: downloadInfo.fileName };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Stream download using token (alternative method)
   */
  static async downloadWithToken(
    documentId: string,
    fileName?: string,
  ): Promise<{ success: boolean }> {
    try {
      const tokenInfo = await this.generateDownloadToken(documentId);

      // Use the token to stream the file
      const streamUrl = `/api/secure/stream/${tokenInfo.token}`;

      const link = document.createElement('a');
      link.href = streamUrl;
      link.download = fileName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}
