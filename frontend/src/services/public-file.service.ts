import { apiClient } from '@/utils/api-client';

import { UploadedFile } from './upload.service';

export interface PaginatedPublicFiles {
  files: UploadedFile[];
  total: number;
  page: number;
  limit: number;
}

export const getPublicFiles = async (page = 1, limit = 10): Promise<PaginatedPublicFiles> => {
  const response = await apiClient.get<PaginatedPublicFiles>(
    `/upload/public?page=${page}&limit=${limit}`
  );
  if (!response.data) {
    throw new Error('No data returned from API');
  }
  return response.data;
};
