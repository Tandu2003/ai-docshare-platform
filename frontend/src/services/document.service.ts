import type {
  AIAnalysis,
  DocumentModerationStatus,
  ModerationAnalysisResponse,
  ModerationDocument,
  ModerationQueueParams,
  ModerationQueueResponse,
} from '@/types';
import { apiClient } from '@/utils/api-client';

import { DocumentsService, FilesService } from './files.service';
import { UploadedFile } from './upload.service';

export interface PaginatedDocuments {
  files: UploadedFile[];
  total: number;
  page: number;
  limit: number;
}

export interface DocumentShareLink {
  token?: string;
  expiresAt: string;
  isRevoked?: boolean;
}

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

export type PreviewStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DocumentView {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  language: string;
  isPublic: boolean;
  isPremium: boolean;
  isApproved: boolean;
  isDraft: boolean;
  moderationStatus: DocumentModerationStatus;
  moderationNotes?: string | null;
  rejectionReason?: string | null;
  moderatedAt?: string | null;
  moderatedById?: string | null;
  viewCount: number;
  downloadCount: number;
  downloadCost?: number; // Points cost to download this document
  originalDownloadCost?: number | null; // Original/custom download cost set by uploader
  systemDefaultDownloadCost?: number; // System default download cost
  hasDownloaded?: boolean; // Whether current user has already downloaded this document
  averageRating: number;
  totalRatings: number;
  createdAt: string;
  updatedAt: string;
  uploader: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  category: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
  };
  files: {
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    fileSize: number | string;
    thumbnailUrl?: string;
    order: number;
    secureUrl?: string; // Temporary secure URL with expiration
    expiresAt?: string; // When the secure URL expires
  }[];
  // Preview system
  previews?: DocumentPreview[];
  previewStatus?: PreviewStatus;
  previewCount?: number;
  stats: {
    ratingsCount: number;
    commentsCount: number;
    viewsCount: number;
    downloadsCount: number;
  };
  shareLink?: DocumentShareLink;
  aiAnalysis?: AIAnalysis | null;
}

export interface ViewDocumentRequest {
  referrer?: string;
}

export const getDocuments = async (
  page = 1,
  limit = 10,
): Promise<PaginatedDocuments> => {
  const response = await apiClient.get<PaginatedDocuments>(
    `/upload/public?page=${page}&limit=${limit}`,
  );
  if (!response.data) {
    throw new Error('Không có dữ liệu trả về từ API');
  }
  return response.data;
};

/**
 * Get document details by ID
 */
export const getDocumentById = async (
  documentId: string,
  apiKey?: string,
): Promise<DocumentView> => {
  const response = await apiClient.get<DocumentView>(
    `/documents/${documentId}`,
    {
      params: apiKey ? { apiKey } : undefined,
    },
  );
  if (!response.data) {
    throw new Error('Không có dữ liệu trả về từ API');
  }
  return response.data;
};

/**
 * Track document view
 */
export const viewDocument = async (
  documentId: string,
  options?: ViewDocumentRequest,
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/documents/${documentId}/view`, options || {});
    if (!response.data) {
      throw new Error('Không có dữ liệu trả về từ API');
    }
    return response.data;
  } catch (error) {
    console.error('Failed to track document view', error);
    // Don't throw error for view tracking as it's not critical
    return { success: false, message: 'Không thể theo dõi lượt xem' };
  }
};

export const getModerationQueue = async (
  params: ModerationQueueParams = {},
): Promise<ModerationQueueResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.uploaderId) searchParams.set('uploaderId', params.uploaderId);
  if (params.status) searchParams.set('status', params.status);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);

  const queryString = searchParams.toString();
  const endpoint = `/admin/documents/pending${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<ModerationQueueResponse>(endpoint);

  if (!response.success || !response.data) {
    throw new Error(
      response.message || 'Không thể lấy danh sách tài liệu chờ duyệt',
    );
  }

  return response.data;
};

export const getModerationDocument = async (
  documentId: string,
): Promise<ModerationDocument> => {
  const response = await apiClient.get<ModerationDocument>(
    `/admin/documents/${documentId}`,
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể lấy chi tiết tài liệu');
  }

  return response.data;
};

export const approveModerationDocument = async (
  documentId: string,
  payload: { notes?: string; publish?: boolean } = {},
): Promise<ModerationDocument> => {
  const response = await apiClient.post<ModerationDocument>(
    `/admin/documents/${documentId}/approve`,
    payload,
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể duyệt tài liệu');
  }

  return response.data;
};

export const rejectModerationDocument = async (
  documentId: string,
  payload: { reason: string; notes?: string },
): Promise<ModerationDocument> => {
  const response = await apiClient.post<ModerationDocument>(
    `/admin/documents/${documentId}/reject`,
    payload,
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể từ chối tài liệu');
  }

  return response.data;
};

export const generateModerationAnalysis = async (
  documentId: string,
): Promise<ModerationAnalysisResponse> => {
  const response = await apiClient.post<ModerationAnalysisResponse>(
    `/admin/documents/${documentId}/analyze`,
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể phân tích AI cho tài liệu');
  }

  return response.data;
};

export const incrementViewCount = async (fileId: string): Promise<void> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message?: string;
    }>(`/documents/upload/view/${fileId}`);

    if (!response.data?.success) {
      console.warn('View count increment failed:', response.data?.message);
    }
  } catch (error) {
    console.error('Failed to increment view count', error);
  }
};

/**
 * Get secure URL for file access (with expiration)
 */
export const getSecureFileUrl = async (fileId: string): Promise<string> => {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: { secureUrl: string };
      message?: string;
    }>(`/documents/files/${fileId}/secure-url`);

    if (response.data?.success) {
      return response.data.data.secureUrl;
    } else {
      throw new Error(
        response.data?.message || 'Không thể lấy URL tệp bảo mật',
      );
    }
  } catch (error: any) {
    console.error('Failed to get secure file URL', error);
    throw new Error(
      error.response?.data?.message || 'Không thể lấy URL tệp bảo mật.',
    );
  }
};

/**
 * Get download URL for a document without tracking download
 */
export const getDownloadUrl = async (
  documentId: string,
): Promise<{
  downloadUrl: string;
  fileName: string;
  fileCount: number;
}> => {
  try {
    console.log('Getting download URL for document:', documentId);

    const response = await apiClient.post<{
      downloadUrl: string;
      fileName: string;
      fileCount: number;
    }>(`/documents/${documentId}/download-url`);

    console.log('Download URL response:', response);

    if (response?.success && response?.data) {
      console.log('Download URL extracted:', response.data);
      return {
        downloadUrl: response.data.downloadUrl,
        fileName: response.data.fileName,
        fileCount: response.data.fileCount,
      };
    } else {
      console.error('Invalid response format:', response.data);
      throw new Error(response.message || 'Không thể lấy URL tải xuống');
    }
  } catch (error: any) {
    console.error('API call failed:', error);
    console.error('Error response:', error.response?.data);
    throw new Error(
      error.response?.data?.message || 'Không thể lấy URL tải xuống.',
    );
  }
};

/**
 * Initialize a download - creates pending record, deducts points if needed
 * Returns downloadId that must be used to confirm the download later
 */
export const initDownload = async (
  documentId: string,
): Promise<{ downloadId: string; alreadyDownloaded: boolean }> => {
  try {
    console.log('Initializing download for document:', documentId);

    const response = await apiClient.post<{
      downloadId: string;
      alreadyDownloaded: boolean;
    }>(`/documents/${documentId}/init-download`, {
      ipAddress: '',
      userAgent: navigator.userAgent,
      referrer: window.location.href,
    });

    if (response?.success && response?.data) {
      console.log('Download initialized:', response.data);
      return response.data;
    }

    throw new Error(response.message || 'Không thể khởi tạo tải xuống');
  } catch (error: any) {
    console.error('Failed to initialize download:', error);
    throw new Error(
      error.response?.data?.message || 'Không thể khởi tạo tải xuống.',
    );
  }
};

/**
 * Confirm a download - marks as successful, deducts points, increments count
 * Call this AFTER the file has been successfully downloaded
 */
export const confirmDownload = async (
  downloadId: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Confirming download:', downloadId);

    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>(`/documents/confirm-download/${downloadId}`);

    if (response?.success) {
      console.log('Download confirmed successfully:', response.data);
      return response.data || { success: true, message: 'OK' };
    }

    // API returned success=false
    console.warn('Download confirmation failed:', response.message);
    return { success: false, message: response.message || 'Xác nhận thất bại' };
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'Không thể xác nhận tải xuống';
    console.error('Failed to confirm download:', errorMessage, error);
    // Return failure info but don't throw - file is already downloaded
    return { success: false, message: errorMessage };
  }
};

/**
 * Cancel a pending download - call if download fails
 */
export const cancelDownload = async (
  downloadId: string,
): Promise<{ success: boolean }> => {
  try {
    console.log('Cancelling download:', downloadId);

    const response = await apiClient.post<{ success: boolean }>(
      `/documents/cancel-download/${downloadId}`,
    );

    return response.data || { success: true };
  } catch (error: any) {
    console.error('Failed to cancel download:', error);
    return { success: false };
  }
};

/**
 * Track download completion (Legacy - uses new init+confirm internally)
 * @deprecated Use initDownload + confirmDownload for better tracking
 */
export const trackDownloadCompletion = async (
  documentId: string,
): Promise<void> => {
  try {
    console.log('Tracking download completion for document:', documentId);

    const response = await apiClient.post<{ success: boolean }>(
      `/documents/${documentId}/track-download`,
      {
        ipAddress: '', // Will be extracted from request
        userAgent: navigator.userAgent,
        referrer: window.location.href,
      },
    );

    if (response?.success) {
      console.log('Download completion tracked successfully');
    } else {
      console.warn('Failed to track download completion:', response.message);
    }
  } catch (error: any) {
    console.error('Failed to track download completion:', error);
    // Don't throw error to avoid breaking the download flow
  }
};

/**
 * Download entire document (all files as ZIP if multiple) - Legacy method
 * @deprecated Use getDownloadUrl + trackDownloadCompletion instead
 */
export const downloadDocument = async (
  documentId: string,
): Promise<{
  downloadUrl: string;
  fileName: string;
  fileCount: number;
}> => {
  try {
    console.log('Calling download API for document:', documentId);

    const response = await apiClient.post<{
      downloadUrl: string;
      fileName: string;
      fileCount: number;
    }>(`/documents/${documentId}/download`, {
      ipAddress: '', // Will be extracted from request
      userAgent: navigator.userAgent,
      referrer: window.location.href,
    });

    console.log('API response:', response);
    console.log('Response data:', response.data);

    if (response?.success && response?.data) {
      console.log('Download data extracted:', response.data);
      return {
        downloadUrl: response.data.downloadUrl,
        fileName: response.data.fileName,
        fileCount: response.data.fileCount,
      };
    } else {
      console.error('Invalid response format:', response.data);
      throw new Error(
        response.message || 'Không thể chuẩn bị tải xuống tài liệu',
      );
    }
  } catch (error: any) {
    console.error('API call failed:', error);
    console.error('Error response:', error.response?.data);
    throw new Error(
      error.response?.data?.message || 'Không thể chuẩn bị tải xuống tài liệu.',
    );
  }
};

/**
 * Test download URL by opening in new tab (for debugging)
 */
export const testDownloadUrl = (url: string) => {
  console.log('Testing download URL:', url);
  window.open(url, '_blank');
};

export interface ShareDocumentRequest {
  expiresInMinutes?: number;
  expiresAt?: string;
  regenerateToken?: boolean;
}

export interface ShareDocumentResponse {
  token?: string;
  expiresAt: string;
  isRevoked: boolean;
  shareUrl?: string;
}

export const createDocumentShareLink = async (
  documentId: string,
  payload: ShareDocumentRequest,
): Promise<ShareDocumentResponse> => {
  const response = await apiClient.post<ShareDocumentResponse>(
    `/documents/${documentId}/share-link`,
    payload,
  );

  if (!response.data) {
    throw new Error('Không có dữ liệu trả về từ API');
  }

  return response.data;
};

export const revokeDocumentShareLink = async (
  documentId: string,
): Promise<void> => {
  const response = await apiClient.delete<null>(
    `/documents/${documentId}/share-link`,
  );
  if (!response.success) {
    throw new Error(response.message || 'Failed to revoke share link');
  }
};

/**
 * Track document view
 */
export const trackDocumentView = async (
  documentId: string,
  referrer?: string,
): Promise<void> => {
  try {
    console.log('Tracking view for document:', documentId);

    const response = await apiClient.post<{
      success: boolean;
      data: any;
      message?: string;
    }>(`/documents/${documentId}/view`, {
      referrer: referrer || window.location.href,
    });

    if (response?.success) {
      console.log('View tracked successfully for document:', documentId);
    } else {
      console.warn('Failed to track view:', response.data?.message);
    }
  } catch (error: any) {
    console.error('Error tracking view:', error);
    // Don't throw error to avoid breaking the user experience
  }
};

/**
 * Check if user has already downloaded a document successfully
 */
export const checkDownloadStatus = async (
  documentId: string,
): Promise<{ hasDownloaded: boolean }> => {
  try {
    const response = await apiClient.get<{ hasDownloaded: boolean }>(
      `/points/download-status/${documentId}`,
    );

    console.log('Download status response:', response);

    // Handle both response formats:
    // 1. Direct data: { hasDownloaded: boolean }
    // 2. ApiResponse: { success, data: { hasDownloaded }, message }
    const responseAny = response as any;

    // Check direct hasDownloaded (some endpoints return data directly)
    if (typeof responseAny?.hasDownloaded === 'boolean') {
      return { hasDownloaded: responseAny.hasDownloaded };
    }

    // Check nested data structure (standard ApiResponse)
    if (
      responseAny?.data &&
      typeof responseAny.data.hasDownloaded === 'boolean'
    ) {
      return { hasDownloaded: responseAny.data.hasDownloaded };
    }

    return { hasDownloaded: false };
  } catch (error) {
    console.error('Error checking download status:', error);
    return { hasDownloaded: false };
  }
};

/**
 * Trigger actual file download in browser with proper 2-step tracking
 * Step 1: initDownload - creates pending download record
 * Step 2: confirmDownload - marks download as successful, deducts points, increments counter
 * On failure: cancelDownload - marks download as failed for audit
 *
 * @returns Object with confirmed status - true only if download was fully confirmed
 */
export const triggerFileDownload = async (
  documentId: string,
  documentTitle?: string,
): Promise<{ confirmed: boolean; message: string }> => {
  let downloadId: string | null = null;

  try {
    console.log('Starting download for document:', documentId);

    // Step 1: Initialize download tracking (creates pending record, deducts points)
    const initResult = await initDownload(documentId);
    downloadId = initResult.downloadId;
    console.log('Download initialized:', {
      downloadId,
      alreadyDownloaded: initResult.alreadyDownloaded,
    });

    // Step 2: Get download URL
    const downloadData = await getDownloadUrl(documentId);
    console.log('Download data received:', downloadData);

    const fileName =
      downloadData.fileName || `${documentTitle || 'document'}.zip`;

    try {
      // Method 1: Fetch as blob and download (best for CORS and security)
      console.log('Fetching file as blob from URL:', downloadData.downloadUrl);

      // Validate URL first
      if (
        !downloadData.downloadUrl ||
        !downloadData.downloadUrl.startsWith('http')
      ) {
        throw new Error(
          `URL tải xuống không hợp lệ: ${downloadData.downloadUrl}`,
        );
      }

      const response = await fetch(downloadData.downloadUrl);
      console.log(
        'Fetch response status:',
        response.status,
        response.statusText,
      );
      console.log(
        'Fetch response headers:',
        Object.fromEntries(response.headers.entries()),
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch error response:', errorText);
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`,
        );
      }

      const blob = await response.blob();
      console.log('Blob received:', {
        size: blob.size,
        type: blob.type,
      });

      if (blob.size === 0) {
        throw new Error('Tệp tải xuống trống');
      }

      // Create blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      console.log('Blob URL created:', blobUrl);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';

      console.log('Download link created:', {
        href: link.href,
        download: link.download,
      });

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      window.URL.revokeObjectURL(blobUrl);

      // Step 3: Confirm download completion AFTER successful file transfer
      // At this point, the file has been successfully fetched and saved to browser
      console.log('Download successful, confirming completion...');
      if (downloadId) {
        const confirmResult = await confirmDownload(downloadId);
        console.log(`Download confirmed: ${confirmResult.success}`);
        return {
          confirmed: confirmResult.success,
          message: confirmResult.success
            ? 'Đã tải xuống tài liệu thành công'
            : confirmResult.message || 'Không thể xác nhận tải xuống',
        };
      }

      console.log(`Downloaded ${fileName} but no downloadId to confirm`);
      return { confirmed: false, message: 'Không có downloadId để xác nhận' };
    } catch (fetchError) {
      console.log('Blob method failed, trying direct download:', fetchError);

      // Method 2: Direct download link (fallback)
      try {
        console.log('Trying window.open method...');
        const newWindow = window.open(downloadData.downloadUrl, '_blank');
        if (newWindow) {
          console.log('Successfully opened download in new window');

          // Confirm download after window opened successfully
          if (downloadId) {
            const confirmResult = await confirmDownload(downloadId);
            return {
              confirmed: confirmResult.success,
              message: confirmResult.success
                ? 'Đã tải xuống tài liệu thành công'
                : confirmResult.message || 'Không thể xác nhận tải xuống',
            };
          }
          return {
            confirmed: false,
            message: 'Không có downloadId để xác nhận',
          };
        } else {
          console.log('Window.open was blocked, trying direct link');
        }
      } catch (windowError) {
        console.log('Window.open failed:', windowError);
      }

      // Method 3: Direct link click (last resort)
      console.log('Trying direct link click...');
      const link = document.createElement('a');
      link.href = downloadData.downloadUrl;
      link.download = fileName;
      link.target = '_blank';
      link.style.display = 'none';

      console.log('Created fallback download link:', {
        href: link.href,
        download: link.download,
        target: link.target,
      });

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Confirm download after link click (best effort for fallback method)
      if (downloadId) {
        const confirmResult = await confirmDownload(downloadId);
        console.log(`Attempted direct download of ${fileName}`);
        return {
          confirmed: confirmResult.success,
          message: confirmResult.success
            ? 'Đã tải xuống tài liệu thành công'
            : confirmResult.message || 'Không thể xác nhận tải xuống',
        };
      }

      console.log(
        `Attempted direct download of ${fileName} without confirmation`,
      );
      return { confirmed: false, message: 'Không có downloadId để xác nhận' };
    }
  } catch (error) {
    console.error('Không thể tải xuống tài liệu', error);

    // Cancel the pending download record if initialization succeeded but download failed
    if (downloadId) {
      console.log('Cancelling failed download:', downloadId);
      try {
        await cancelDownload(downloadId);
      } catch (cancelError) {
        console.error('Failed to cancel download:', cancelError);
      }
    }

    throw error;
  }
};

// Re-export new services for easy access
export { DocumentsService, FilesService };

// ================================
// SIMILARITY DETECTION SERVICES
// ================================

export interface SimilarityResult {
  id: string;
  targetDocument: {
    id: string;
    title: string;
    description?: string;
    uploader: {
      id: string;
      username: string;
      firstName?: string;
      lastName?: string;
    };
    category: {
      id: string;
      name: string;
    };
    createdAt: string;
  };
  similarityScore: number;
  similarityType: string;
  createdAt: string;
}

/**
 * Get similarity results for moderation
 */
export const getSimilarityResults = async (
  documentId: string,
): Promise<SimilarityResult[]> => {
  try {
    const response = await apiClient.get<SimilarityResult[]>(
      `/similarity/results/${documentId}`,
    );

    // ApiClient wraps response in { success, data, message }
    // The actual array is in response.data
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    // If response itself is array (shouldn't happen with apiClient but just in case)
    if (Array.isArray(response)) {
      return response;
    }

    // Return empty array if no data
    console.warn('No similarity results found for document:', documentId);
    return [];
  } catch (error) {
    console.error('Error fetching similarity results:', error);
    // Return empty array instead of throwing to prevent UI crash
    return [];
  }
};

/**
 * Process admin decision on similarity
 */
export const processSimilarityDecision = async (
  similarityId: string,
  decision: { isDuplicate: boolean; notes?: string },
): Promise<void> => {
  const response = await apiClient.put<void>(
    `/similarity/decision/${similarityId}`,
    decision,
  );

  if (!response.success) {
    throw new Error(response.message || 'Không thể xử lý quyết định');
  }
};

/**
 * Queue similarity detection for a document
 */
export const queueSimilarityDetection = async (
  documentId: string,
): Promise<{ id: string; status: string }> => {
  const response = await apiClient.post<{ id: string; status: string }>(
    `/similarity/detect/${documentId}`,
  );

  if (!response.data) {
    throw new Error('Không có dữ liệu trả về từ API');
  }

  return response.data;
};

/**
 * Generate embedding for a document
 */
export const generateDocumentEmbedding = async (
  documentId: string,
): Promise<{ success: boolean; embeddingLength: number }> => {
  const response = await apiClient.post<{
    success: boolean;
    embeddingLength: number;
  }>(`/similarity/embedding/${documentId}`);

  if (!response.data) {
    throw new Error('Không có dữ liệu trả về từ API');
  }

  return response.data;
};
