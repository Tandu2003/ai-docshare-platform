import { apiClient } from '@/utils/api-client'

import { DocumentsService, FilesService } from './files.service'
import { UploadedFile } from './upload.service'

export interface PaginatedDocuments {
  files: UploadedFile[];
  total: number;
  page: number;
  limit: number;
}

export interface DocumentView {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  language: string;
  isPublic: boolean;
  isPremium: boolean;
  viewCount: number;
  downloadCount: number;
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
  };
  files: {
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    fileSize: bigint;
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
}

export interface ViewDocumentRequest {
  referrer?: string;
}

export const getDocuments = async (page = 1, limit = 10): Promise<PaginatedDocuments> => {
  const response = await apiClient.get<PaginatedDocuments>(
    `/upload/public?page=${page}&limit=${limit}`
  );
  if (!response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
};

/**
 * Get document details by ID
 */
export const getDocumentById = async (documentId: string): Promise<DocumentView> => {
  const response = await apiClient.get<DocumentView>(`/documents/${documentId}`);
  if (!response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
};

/**
 * Track document view
 */
export const viewDocument = async (
  documentId: string,
  options?: ViewDocumentRequest
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/documents/${documentId}/view`,
      options || {}
    );
    if (!response.data) {
      throw new Error('No data returned from API');
    }
    return response.data;
  } catch (error) {
    console.error('Failed to track document view', error);
    // Don't throw error for view tracking as it's not critical
    return { success: false, message: 'Failed to track view' };
  }
};

export const incrementViewCount = async (fileId: string): Promise<void> => {
  try {
    await apiClient.post(`/upload/view/${fileId}`);
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
    }>(`/files/${fileId}/secure-url`);
    
    if (response.data?.success) {
      return response.data.data.secureUrl;
    } else {
      throw new Error(response.data?.message || 'Failed to get secure file URL');
    }
  } catch (error: any) {
    console.error('Failed to get secure file URL', error);
    throw new Error(error.response?.data?.message || 'Could not get secure file URL.');
  }
};

/**
 * Download entire document (all files as ZIP if multiple)
 */
export const downloadDocument = async (documentId: string): Promise<{
  downloadUrl: string;
  fileName: string;
  fileCount: number;
}> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data: {
        downloadUrl: string;
        fileName: string;
        fileCount: number;
      };
      message?: string;
    }>(`/documents/${documentId}/download`, {
      ipAddress: '', // Will be extracted from request
      userAgent: navigator.userAgent,
      referrer: window.location.href,
    });
    
    if (response.data?.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to prepare document download');
    }
  } catch (error: any) {
    console.error('Failed to prepare document download', error);
    throw new Error(error.response?.data?.message || 'Could not prepare document download.');
  }
};

/**
 * Trigger actual file download in browser
 */
export const triggerFileDownload = async (documentId: string, documentTitle?: string): Promise<void> => {
  try {
    // Get download URL
    const downloadData = await downloadDocument(documentId);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadData.downloadUrl;
    link.download = downloadData.fileName || `${documentTitle || 'document'}.zip`;
    
    // Add to DOM temporarily, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message
    console.log(`Downloaded ${downloadData.fileCount} file(s) as ${downloadData.fileName}`);
  } catch (error) {
    console.error('Failed to download document', error);
    throw error;
  }
};

// Re-export new services for easy access
export { DocumentsService, FilesService };
