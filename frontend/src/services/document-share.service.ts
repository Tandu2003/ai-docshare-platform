import { apiClient } from '@/utils/api-client';

import type {
  ShareDocumentRequest,
  ShareDocumentResponse,
} from './document.types';

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

