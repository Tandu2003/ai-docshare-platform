import { ApiResponse } from '@/types'
import { apiClient } from '@/utils/api-client'

export interface FileUploadResult {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  storageUrl: string;
  fileHash: string;
}

export interface CreateDocumentData {
  title: string;
  description?: string;
  fileIds: string[];
  categoryId?: string;
  isPublic?: boolean;
  tags?: string[];
  language?: string;
}

export interface Document {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  tags: string[];
  language: string;
  createdAt: string;
  updatedAt: string;
  uploaderId: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  files: Array<{
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageUrl: string;
    order: number;
  }>;
}

export interface PaginatedDocuments {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
}

export class FilesService {
  /**
   * Upload files to storage
   */
  static async uploadFiles(files: File[]): Promise<ApiResponse<FileUploadResult[]>> {
    const formData = new FormData();

    files.forEach((file) => {
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
        }
      );

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to upload files:', error);
      throw new Error('Failed to upload files');
    }
  }

  /**
   * Get download URL for a file
   */
  static async getFileDownloadUrl(fileId: string): Promise<string> {
    try {
      const response = await apiClient.post<{ downloadUrl: string }>(`/files/download/${fileId}`);
      if (!response.data?.downloadUrl) {
        throw new Error('Download URL not provided');
      }
      return response.data.downloadUrl;
    } catch (error) {
      console.error('Failed to get file download URL', error);
      throw new Error('Could not get download link.');
    }
  }

  /**
   * Download file using blob method
   */
  static async downloadFile(fileId: string, fileName?: string): Promise<void> {
    try {
      // Get the download URL
      const downloadUrl = await FilesService.getFileDownloadUrl(fileId);

      // Fetch the file as a blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();

      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = blobUrl;

      // Set the download attribute with the filename
      if (fileName) {
        link.download = fileName;
      } else {
        // Extract filename from URL if not provided
        const url = new URL(downloadUrl);
        const pathName = url.pathname;
        const extractedName = pathName.substring(pathName.lastIndexOf('/') + 1);
        // Remove query parameters from filename
        const cleanName = extractedName.split('?')[0];
        link.download = cleanName || 'download';
      }

      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download file', error);
      throw new Error('Could not download file.');
    }
  }
}

export class DocumentsService {
  /**
   * Create a document from uploaded files
   */
  static async createDocument(documentData: CreateDocumentData): Promise<any> {
    try {
      const response = await apiClient.post('/documents/create', documentData);
      return response.data;
    } catch (error) {
      console.error('Failed to create document:', error);
      throw new Error('Failed to create document');
    }
  }

  /**
   * Get user's documents with pagination
   */
  static async getUserDocuments(page: number = 1, limit: number = 10): Promise<PaginatedDocuments> {
    try {
      const response = await apiClient.get<PaginatedDocuments>(
        `/documents/my?page=${page}&limit=${limit}`
      );

      if (!response.data) {
        throw new Error('No data returned from API');
      }

      return response.data;
    } catch (error) {
      console.error('Failed to get user documents:', error);
      throw new Error('Failed to get user documents');
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string): Promise<void> {
    try {
      await apiClient.delete(`/documents/${documentId}`);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Download all files of a document
   */
  static async downloadDocument(documentId: string): Promise<void> {
    try {
      const response = await apiClient.post<{ downloadUrl: string; title: string }>(
        `/documents/download/${documentId}`
      );

      if (!response.data?.downloadUrl) {
        throw new Error('Download URL not provided');
      }

      // Use the existing download method
      await this.downloadFileFromUrl(response.data.downloadUrl, response.data.title);
    } catch (error) {
      console.error('Failed to download document', error);
      throw new Error('Could not download document.');
    }
  }

  /**
   * Download file from URL using blob method
   */
  private static async downloadFileFromUrl(downloadUrl: string, fileName: string): Promise<void> {
    try {
      // Fetch the file as a blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
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
    } catch (error) {
      console.error('Failed to download file from URL', error);
      throw new Error('Could not download file.');
    }
  }
}
