import { apiClient } from '@/utils/api-client';

import { DocumentsService, FilesService } from './files.service';
import { UploadedFile } from './upload.service';

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
  isApproved: boolean;
  isDraft: boolean;
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
    icon?: string;
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
export const downloadDocument = async (
  documentId: string
): Promise<{
  downloadUrl: string;
  fileName: string;
  fileCount: number;
}> => {
  try {
    console.log('Calling download API for document:', documentId);

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

    console.log('API response:', response);
    console.log('Response data:', response.data);

    if (response?.success && response?.data) {
      console.log('Download data extracted:', response.data);
      return {
        downloadUrl: response.data.data.downloadUrl,
        fileName: response.data.data.fileName,
        fileCount: response.data.data.fileCount,
      };
    } else {
      console.error('Invalid response format:', response.data);
      throw new Error(response.data?.message || 'Failed to prepare document download');
    }
  } catch (error: any) {
    console.error('API call failed:', error);
    console.error('Error response:', error.response?.data);
    throw new Error(error.response?.data?.message || 'Could not prepare document download.');
  }
};

/**
 * Test download URL by opening in new tab (for debugging)
 */
export const testDownloadUrl = (url: string) => {
  console.log('Testing download URL:', url);
  window.open(url, '_blank');
};

/**
 * Trigger actual file download in browser
 */
export const triggerFileDownload = async (
  documentId: string,
  documentTitle?: string
): Promise<void> => {
  try {
    console.log('Starting download for document:', documentId);

    // Get download URL
    const downloadData = await downloadDocument(documentId);
    console.log('Download data received:', downloadData);

    const fileName = downloadData.fileName || `${documentTitle || 'document'}.zip`;

    try {
      // Method 1: Fetch as blob and download (best for CORS and security)
      console.log('Fetching file as blob from URL:', downloadData.downloadUrl);

      // Validate URL first
      if (!downloadData.downloadUrl || !downloadData.downloadUrl.startsWith('http')) {
        throw new Error(`Invalid download URL: ${downloadData.downloadUrl}`);
      }

      const response = await fetch(downloadData.downloadUrl);
      console.log('Fetch response status:', response.status, response.statusText);
      console.log('Fetch response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`);
      }

      const blob = await response.blob();
      console.log('Blob received:', {
        size: blob.size,
        type: blob.type,
      });

      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

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

      console.log(`Attempted direct download of ${fileName}`);
    }
  } catch (error) {
    console.error('Failed to download document', error);
    throw error;
  }
};

// Re-export new services for easy access
export { DocumentsService, FilesService };
