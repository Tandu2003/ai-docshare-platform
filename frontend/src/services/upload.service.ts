import { api } from '@/config/api'

interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: string;
}

export interface UploadFileData {
  title?: string;
  description?: string;
  categoryId?: string;
  isPublic?: boolean;
  tags?: string[];
  language?: string;
}

export type UploadedFile = {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  storageUrl: string;
  isPublic: boolean;
  createdAt: string;
  uploader: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
};

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
   * Upload a single file
   */
  static async uploadSingleFile(
    file: File,
    data: UploadFileData = {}
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Append other data
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.categoryId) formData.append('categoryId', data.categoryId);
    if (data.isPublic !== undefined) formData.append('isPublic', String(data.isPublic));
    if (data.language) formData.append('language', data.language);
    if (data.tags) {
      data.tags.forEach((tag) => formData.append('tags[]', tag));
    }

    const response = await api.post<ApiResponse<FileUploadResponse>>('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data!.data;
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(
    files: File[],
    data: UploadFileData = {}
  ): Promise<FileUploadResponse[]> {
    const formData = new FormData();

    // Append files
    files.forEach((file) => {
      formData.append('files', file);
    });

    // Append other data
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.categoryId) formData.append('categoryId', data.categoryId);
    if (data.isPublic !== undefined) formData.append('isPublic', String(data.isPublic));
    if (data.language) formData.append('language', data.language);
    if (data.tags) {
      data.tags.forEach((tag) => formData.append('tags[]', tag));
    }

    const response = await api.post<ApiResponse<FileUploadResponse[]>>(
      '/upload/multiple',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data!.data;
  }

  /**
   * Get user's uploaded files
   */
  static async getUserFiles(
    page: number = 1,
    limit: number = 20,
    mimeType?: string
  ): Promise<FilesListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (mimeType) {
      params.append('mimeType', mimeType);
    }

    const response = await api.get<ApiResponse<FilesListResponse>>(`/upload/my-files?${params}`);
    return response.data!.data;
  }

  /**
   * Get file details
   */
  static async getFile(fileId: string): Promise<UploadedFile> {
    const response = await api.get<ApiResponse<UploadedFile>>(`/upload/file/${fileId}`);
    return response.data!.data;
  }

  /**
   * Get download URL
   */
  static async getDownloadUrl(fileId: string): Promise<string> {
    const response = await api.get<ApiResponse<{ downloadUrl: string }>>(
      `/upload/download/${fileId}`
    );
    return response.data!.data.downloadUrl;
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/upload/file/${fileId}`);
  }

  /**
   * Get allowed file types
   */
  static async getAllowedTypes(): Promise<string[]> {
    const response =
      await api.get<ApiResponse<{ allowedTypes: string[] }>>('/upload/allowed-types');
    return response.data!.data.allowedTypes;
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file type icon
   */
  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('text')) return '📄';
    return '📁';
  }

  /**
   * Validate file before upload
   */
  static validateFile(
    file: File,
    allowedTypes: string[],
    maxSize: number = 100 * 1024 * 1024
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
          fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'xls':
        case 'xlsx':
          fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'ppt':
        case 'pptx':
          fileType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
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
