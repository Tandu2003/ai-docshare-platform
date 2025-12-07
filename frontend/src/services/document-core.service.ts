import { apiClient } from '@/utils/api-client';
import type {
  DocumentView,
  PaginatedDocuments,
  ViewDocumentRequest,
} from './document.types';
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
  } catch {
    return { success: false, message: 'Không thể theo dõi lượt xem' };
  }
};

export const trackDocumentView = async (
  documentId: string,
  referrer?: string,
): Promise<void> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data: unknown;
      message?: string;
    }>(`/documents/${documentId}/view`, {
      referrer: referrer || window.location.href,
    });

    if (!response?.success) {
      // Failed to track view
    }
  } catch {
    // Don't throw error to avoid breaking the user experience
  }
};

export const incrementViewCount = async (fileId: string): Promise<void> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      message?: string;
    }>(`/documents/upload/view/${fileId}`);

    if (!response.data?.success) {
      // View count increment failed
    }
  } catch {
    // Failed to increment view count
  }
};
