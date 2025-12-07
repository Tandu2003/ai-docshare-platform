import { apiClient } from '@/utils/api-client';

import type { SimilarityResult } from './document.types';

export const getSimilarityResults = async (
  documentId: string,
): Promise<SimilarityResult[]> => {
  try {
    const response = await apiClient.get<SimilarityResult[]>(
      `/similarity/results/${documentId}`,
    );

    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  } catch {
    return [];
  }
};

export const processSimilarityDecision = async (
  similarityId: string,
  decision: { isDuplicate: boolean; notes?: string },
): Promise<void> => {
  const response = await apiClient.put<void>(
    `/similarity/decision/${similarityId}`,
    decision,
  );

  if (!response.success) {
    throw new Error(response.message || 'Không thể xử lý quyết định');
  }
};

export const queueSimilarityDetection = async (
  documentId: string,
): Promise<{ id: string; status: string }> => {
  const response = await apiClient.post<{ id: string; status: string }>(
    `/similarity/detect/${documentId}`,
  );

  if (!response.data) {
    throw new Error('Không có dữ liệu trả về từ API');
  }

  return response.data;
};

export const generateDocumentEmbedding = async (
  documentId: string,
): Promise<{ success: boolean; embeddingLength: number }> => {
  const response = await apiClient.post<{
    success: boolean;
    embeddingLength: number;
  }>(`/similarity/embedding/${documentId}`);

  if (!response.data) {
    throw new Error('Không có dữ liệu trả về từ API');
  }

  return response.data;
};

