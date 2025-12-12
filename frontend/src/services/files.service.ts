import type { DocumentModerationStatus } from '@/types';
import { ApiResponse } from '@/types/api.types';
import { apiClient } from '@/utils/api-client';

export interface FileUploadResult {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  storageUrl: string;
  fileHash: string;
}
export interface AvatarUploadResult {
  id: string;
  avatarUrl: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface CreateDocumentData {
  title: string;
  description?: string;
  fileIds: string[];
  categoryId?: string;
  isPublic?: boolean;
  tags?: string[];
  language?: string;
  downloadCost?: number | null; // null = use system default
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  categoryId?: string;
  isPublic?: boolean;
  tags?: string[];
  language?: string;
  downloadCost?: number | null; // null = use system default
  filesEdited?: boolean;
  fileIds?: string[]; // Update document files
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  uploaderId: string;
  categoryId: string;
  downloadCount: number;
  viewCount: number;
  // storageUrl: string; // Removed for security
  secureUrl?: string; // Temporary secure URL
  expiresAt?: string; // Expiration time
  averageRating: number;
  totalRatings: number;
  isPublic: boolean;
  isPremium: boolean;
  isApproved: boolean;
  isDraft: boolean;
  moderationStatus?: DocumentModerationStatus;
  moderatedById?: string | null;
  moderatedAt?: string | null;
  moderationNotes?: string | null;
  rejectionReason?: string | null;
  tags: string[];
  language: string;
  createdAt: string;
  updatedAt: string;
  similarityScore?: number; // Vector search similarity score (0-1)
  uploader?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  category?: {
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
    // storageUrl: string; // Removed for security
    secureUrl?: string; // Temporary secure URL
    expiresAt?: string; // Expiration time
    thumbnailUrl?: string;
    order: number;
  }[];
}
export interface PaginatedDocuments {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  searchMethod?: 'hybrid';
}

export class FilesService {
  static async uploadFiles(
    files: File[],
    onProgress?: (progress: number) => void,
  ): Promise<ApiResponse<FileUploadResult[]>> {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await apiClient.post<ApiResponse<FileUploadResult[]>>(
        '/files/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000 * 2, // 2 minutes
          onUploadProgress: (progressEvent: {
            loaded: number;
            total?: number;
          }) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              onProgress(percentCompleted);
            }
          },
        },
      );

      if (!response.data) {
        throw new Error('Không có dữ liệu trả về từ API');
      }

      return response.data;
    } catch {
      throw new Error('Không thể tải lên tệp');
    }
  }

  static async uploadAvatar(
    file: File,
  ): Promise<ApiResponse<AvatarUploadResult>> {
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await apiClient.post<ApiResponse<AvatarUploadResult>>(
        '/files/upload/avatar',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 seconds
        },
      );

      if (!response.data) {
        throw new Error('Không có dữ liệu trả về từ API');
      }

      return response.data;
    } catch (err: unknown) {
      const error = err as { message?: string };
      throw new Error(error.message || 'Không thể tải lên ảnh đại diện');
    }
  }
}

export class DocumentsService {
  static async createDocument(documentData: CreateDocumentData): Promise<any> {
    try {
      const response = await apiClient.post('/documents/create', documentData);
      return response.data;
    } catch {
      throw new Error('Không thể tạo tài liệu');
    }
  }

  static async getUserDocuments(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedDocuments> {
    try {
      const response = await apiClient.get<PaginatedDocuments>(
        `/documents/my?page=${page}&limit=${limit}`,
      );

      if (!response.data) {
        throw new Error('Không có dữ liệu trả về từ API');
      }

      return response.data;
    } catch {
      throw new Error('Không thể lấy tài liệu của người dùng');
    }
  }

  static async getPublicDocuments(
    page: number = 1,
    limit: number = 10,
    filters?: {
      categoryId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<PaginatedDocuments> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.categoryId) {
        params.append('categoryId', filters.categoryId);
      }

      if (filters?.sortBy) {
        params.append('sortBy', filters.sortBy);
      }

      if (filters?.sortOrder) {
        params.append('sortOrder', filters.sortOrder);
      }

      const response = await apiClient.get<PaginatedDocuments>(
        `/documents/public?${params.toString()}`,
      );

      if (!response.data) {
        throw new Error('Không có dữ liệu trả về từ API');
      }

      return response.data;
    } catch {
      throw new Error('Không thể lấy tài liệu công khai');
    }
  }

  static async searchDocuments(
    query: string,
    page: number = 1,
    limit: number = 10,
    filters?: {
      categoryId?: string;
      tags?: string[];
      language?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<PaginatedDocuments> {
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.categoryId) {
        params.append('categoryId', filters.categoryId);
      }

      if (filters?.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }

      if (filters?.language) {
        params.append('language', filters.language);
      }

      if (filters?.sortBy) {
        params.append('sortBy', filters.sortBy);
      }

      if (filters?.sortOrder) {
        params.append('sortOrder', filters.sortOrder);
      }

      const response = await apiClient.get<PaginatedDocuments>(
        `/documents/search?${params.toString()}`,
      );

      if (!response.data) {
        throw new Error('Không có dữ liệu trả về từ API');
      }

      return response.data;
    } catch {
      throw new Error('Không thể tìm kiếm tài liệu');
    }
  }

  static async deleteDocument(documentId: string): Promise<void> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message?: string;
      }>(`/documents/${documentId}`);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Không thể xóa tài liệu');
      }
    } catch {
      throw new Error('Không thể xóa tài liệu');
    }
  }

  static async updateDocument(
    documentId: string,
    updateData: UpdateDocumentData,
  ): Promise<any> {
    try {
      const response = await apiClient.patch(
        `/documents/${documentId}`,
        updateData,
      );
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      throw new Error(
        error.response?.data?.message || 'Không thể cập nhật tài liệu',
      );
    }
  }

  static async downloadDocument(documentId: string): Promise<void> {
    try {
      // Step 1: Get download URL without tracking
      const response = await apiClient.post<{
        downloadUrl: string;
        fileName: string;
        fileCount: number;
      }>(`/documents/${documentId}/download-url`);

      if (!response.success || !response.data?.downloadUrl) {
        throw new Error('Không được cung cấp URL tải xuống');
      }

      // Step 2: Download the file
      await this.downloadFileFromUrl(
        response.data.downloadUrl,
        response.data.fileName,
      );

      // Step 3: Track download completion
      try {
        await apiClient.post<{ success: boolean }>(
          `/documents/${documentId}/track-download`,
          {
            ipAddress: '',
            userAgent: navigator.userAgent,
            referrer: window.location.href,
          },
        );
      } catch {
        // Don't throw error to avoid breaking the download flow
      }
    } catch {
      throw new Error('Không thể tải xuống tài liệu.');
    }
  }

  private static async downloadFileFromUrl(
    downloadUrl: string,
    fileName: string,
  ): Promise<void> {
    try {
      // Fetch the file as a blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Không thể tìm nạp tệp');
      }

      const blob = await response.blob();

      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'document';

      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      throw new Error('Không thể tải xuống tệp.');
    }
  }

  static async trackDocumentView(
    documentId: string,
    referrer?: string,
  ): Promise<void> {
    try {
      await apiClient.post<{
        success: boolean;
        data: any;
        message?: string;
      }>(`/documents/${documentId}/view`, {
        referrer: referrer || window.location.href,
      });

      // Track view silently
    } catch {
      // Don't throw error to avoid breaking the user experience
    }
  }
}
