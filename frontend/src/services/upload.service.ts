import { api } from '@/config/api';

export interface UploadFileData {
  title?: string;
  description?: string;
  categoryId?: string;
  isPublic?: boolean;
  tags?: string[];
  language?: string;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileHash: string;
  createdAt: string;
  // storageUrl?: string; // Removed for security - use getSecureFileUrl instead
  secureUrl?: string; // Temporary secure URL
  expiresAt?: string; // When secure URL expires
}

export interface FileUploadResponse {
  file: UploadedFile;
  document?: {
    id: string;
    title: string;
    description?: string;
    isPublic: boolean;
    downloadCount: number;
    viewCount: number;
  };
}

export interface FilesListResponse {
  files: UploadedFile[];
  total: number;
  page: number;
  limit: number;
}

export class UploadService {
  /**
   * Upload files (single or multiple)
   */
  static async uploadFiles(
    files: File[],
    data: UploadFileData = {},
  ): Promise<FileUploadResponse[] | FileUploadResponse> {
    const formData = new FormData();

    // Append files
    files.forEach(file => {
      formData.append('files', file);
    });

    // Append other data
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.categoryId) formData.append('categoryId', data.categoryId);
    if (data.isPublic !== undefined)
      formData.append('isPublic', String(data.isPublic));
    if (data.language) formData.append('language', data.language);
    if (data.tags) {
      data.tags.forEach(tag => formData.append('tags[]', tag));
    }

    try {
        fileCount: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type })),
      });

      const response = await api.post<
        FileUploadResponse[] | FileUploadResponse
      >('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Increase timeout for large files
        timeout: 60000 * 2, // 2 minutes
      });

      // Check if response is successful based on the success flag
      if (!response.data || !response.success) {
        const errorMessage = response.message || 'Invalid response from server';
        throw new Error(errorMessage);
      }

      return response.data;
    } catch (error) {

      // Handle specific error types
      if (error instanceof Error) {
        // Just rethrow if we've already created a specific error
        throw error;
      }

      // Enhance error message with details from the server for axios errors
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
      };
      if (axiosError.response?.data?.message) {
        throw new Error(`Upload failed: ${axiosError.response.data.message}`);
      } else if (axiosError.response?.data?.error) {
        throw new Error(`Upload failed: ${axiosError.response.data.error}`);
      }

      // Generic error
      throw new Error('File upload failed. Please try again.');
    }
  }

  /**
   * Upload a single file (for backward compatibility)
   */
  static async uploadSingleFile(
    file: File,
    data: UploadFileData = {},
  ): Promise<FileUploadResponse> {
    try {
      const result = await this.uploadFiles([file], data);
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload multiple files (for backward compatibility)
   */
  static async uploadMultipleFiles(
    files: File[],
    data: UploadFileData = {},
  ): Promise<FileUploadResponse[]> {
    try {
      const result = await this.uploadFiles(files, data);
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's uploaded files
   */
  static async getUserFiles(
    page: number = 1,
    limit: number = 20,
    mimeType?: string,
  ): Promise<FilesListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (mimeType) {
      params.append('mimeType', mimeType);
    }

    try {
      const response = await api.get<FilesListResponse>(
        `/upload/my-files?${params}`,
      );

      if (!response.data || !response.success) {
        throw new Error(response.message || 'Failed to fetch user files');
      }

      return response.data;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to fetch user files');
    }
  }

  /**
   * Get file details
   */
  static async getFile(fileId: string): Promise<UploadedFile> {
    try {
      const response = await api.get<UploadedFile>(`/upload/file/${fileId}`);

      if (!response.data || !response.success) {
        throw new Error(response.message || 'Failed to fetch file details');
      }

      return response.data;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to fetch file details');
    }
  }

  /**
   * Get download URL
   */
  static async getDownloadUrl(fileId: string): Promise<string> {
    try {
      const response = await api.get<{ downloadUrl: string }>(
        `/upload/download/${fileId}`,
      );

      if (!response.data || !response.success || !response.data?.downloadUrl) {
        throw new Error(response.message || 'Failed to get download URL');
      }

      return response.data.downloadUrl;
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error('Failed to get download URL');
    }
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await api.delete<void>(`/upload/file/${fileId}`);

      if (!response.data || !response.success) {
        throw new Error(response.message || 'Failed to delete file');
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to delete file');
    }
  }

  /**
   * Get allowed file types
   */
  static async getAllowedTypes(): Promise<string[]> {
    try {
      const response = await api.get<{ types: string[]; description: string }>(
        '/documents/upload/allowed-types',
      );

      if (!response.data || !response.success) {
        throw new Error(response.message || 'Failed to get allowed file types');
      }

      return response.data.types;
    } catch (error) {
      // Return empty array as fallback to allow all file types
      return [];
    }
  }

  /**
   * Format file size
   * Can handle number or string input (for BigInt string values)
   */
  static formatFileSize(bytes: number | string): string {
    // Convert string to number if needed
    const bytesNum = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;

    if (bytesNum === 0 || isNaN(bytesNum)) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytesNum) / Math.log(k));

    return parseFloat((bytesNum / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon
   */
  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
      return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
      return '📽️';
    if (mimeType.includes('text')) return '📄';
    return '📁';
  }

  /**
   * Validate file before upload
   */
  static validateFile(
    file: File,
    allowedTypes: string[],
    maxSize: number = 100 * 1024 * 1024,
  ): string | null {
    // Check file size
    if (file.size > maxSize) {
      return `File size exceeds ${this.formatFileSize(maxSize)} limit`;
    }

    // If allowedTypes is empty, skip type validation (allow all types)
    if (allowedTypes.length === 0) {
      return null;
    }

    // Get file type, fallback to extension-based detection if undefined
    let fileType = file.type;
    if (!fileType || fileType === '') {
      // Try to determine type from file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'pdf':
          fileType = 'application/pdf';
          break;
        case 'doc':
        case 'docx':
          fileType =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'xls':
        case 'xlsx':
          fileType =
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'ppt':
        case 'pptx':
          fileType =
            'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          break;
        case 'txt':
          fileType = 'text/plain';
          break;
        case 'csv':
          fileType = 'text/csv';
          break;
        case 'jpg':
        case 'jpeg':
          fileType = 'image/jpeg';
          break;
        case 'png':
          fileType = 'image/png';
          break;
        case 'gif':
          fileType = 'image/gif';
          break;
        default:
          fileType = 'application/octet-stream';
      }
    }

    // Check file type
    if (!allowedTypes.includes(fileType)) {
      return `File type ${fileType} is not allowed`;
    }

    return null;
  }
}
