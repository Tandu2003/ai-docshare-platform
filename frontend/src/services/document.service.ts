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
 * Track download completion
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
 * Trigger actual file download in browser with proper tracking
 */
export const triggerFileDownload = async (
  documentId: string,
  documentTitle?: string,
): Promise<void> => {
  try {
    console.log('Starting download for document:', documentId);

    // Step 1: Get download URL without tracking
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

      // Step 2: Track download completion since we successfully got the file
      console.log('File downloaded successfully, tracking completion...');
      await trackDownloadCompletion(documentId);

      // Create blob URL and download
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

      console.log(`Successfully downloaded ${fileName}`);
      return;
    } catch (fetchError) {
      console.log('Blob method failed, trying direct download:', fetchError);

      // Method 2: Direct download link (fallback)
      try {
        console.log('Trying window.open method...');
        const newWindow = window.open(downloadData.downloadUrl, '_blank');
        if (newWindow) {
          console.log('Successfully opened download in new window');

          // Track download completion for direct download
          await trackDownloadCompletion(documentId);
          return;
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

      // Track download completion for direct link click
      await trackDownloadCompletion(documentId);

      console.log(`Attempted direct download of ${fileName}`);
    }
  } catch (error) {
    console.error('Không thể tải xuống tài liệu', error);
    throw error;
  }
};

// Re-export new services for easy access
export { DocumentsService, FilesService };
