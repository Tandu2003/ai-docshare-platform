import { apiClient } from '@/utils/api-client'

import { UploadedFile } from './upload.service'

export interface PaginatedDocuments {
  files: UploadedFile[];
  total: number;
  page: number;
  limit: number;
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

export const incrementViewCount = async (fileId: string): Promise<void> => {
  try {
    await apiClient.post(`/upload/view/${fileId}`);
  } catch (error) {
    console.error('Failed to increment view count', error);
  }
};
