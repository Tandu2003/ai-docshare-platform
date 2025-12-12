import type {
  DocumentModerationStatus,
  ModerationAnalysisResponse,
  ModerationDocument,
  ModerationQueueParams,
  ModerationQueueResponse,
} from '@/types';
import { apiClient } from '@/utils/api-client';

export const getModerationQueue = async (
  params: ModerationQueueParams = {},
): Promise<ModerationQueueResponse> => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.uploaderId) searchParams.set('uploaderId', params.uploaderId);
  if (params.status) searchParams.set('status', params.status);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.order) searchParams.set('order', params.order);

  const queryString = searchParams.toString();
  const endpoint = `/admin/documents/pending${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<ModerationQueueResponse>(endpoint);

  if (!response.success || !response.data) {
    throw new Error(
      response.message || 'Không thể lấy danh sách tài liệu chờ duyệt',
    );
  }

  return response.data;
};

export const getModerationDocument = async (
  documentId: string,
): Promise<ModerationDocument> => {
  const response = await apiClient.get<ModerationDocument>(
    `/admin/documents/${documentId}`,
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể lấy chi tiết tài liệu');
  }

  return response.data;
};

export const approveModerationDocument = async (
  documentId: string,
  payload: { notes?: string; publish?: boolean } = {},
): Promise<ModerationDocument> => {
  const response = await apiClient.post<ModerationDocument>(
    `/admin/documents/${documentId}/approve`,
    payload,
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể duyệt tài liệu');
  }

  return response.data;
};

export const rejectModerationDocument = async (
  documentId: string,
  payload: { reason: string; notes?: string },
): Promise<ModerationDocument> => {
  const response = await apiClient.post<ModerationDocument>(
    `/admin/documents/${documentId}/reject`,
    payload,
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể từ chối tài liệu');
  }

  return response.data;
};

export const generateModerationAnalysis = async (
  documentId: string,
): Promise<ModerationAnalysisResponse> => {
  const response = await apiClient.post<ModerationAnalysisResponse>(
    `/admin/documents/${documentId}/analyze`,
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể phân tích AI cho tài liệu');
  }

  return response.data;
};

export interface PrivateDocumentsParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AllDocumentsParams {
  page?: number;
  limit?: number;
  categoryIds?: string[];
  isPublic?: boolean | 'all';
  moderationStatus?: DocumentModerationStatus | 'all';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PrivateDocumentsResponse {
  documents: Array<{
    id: string;
    title: string;
    description: string | null;
    isPublic: boolean;
    isApproved: boolean;
    moderationStatus: string;
    tags: string[];
    language: string;
    createdAt: string;
    updatedAt: string;
    uploaderId: string;
    categoryId: string | null;
    category: any;
    uploader: {
      id: string;
      username: string;
      firstName: string | null;
      lastName: string | null;
    };
    downloadCount: number;
    viewCount: number;
    averageRating: number | null;
    files: any[];
  }>;
  total: number;
  page: number;
  limit: number;
}

export const getPrivateDocuments = async (
  params: PrivateDocumentsParams = {},
): Promise<PrivateDocumentsResponse> => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const queryString = searchParams.toString();
  const endpoint = `/admin/documents/private${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<PrivateDocumentsResponse>(endpoint);

  if (!response.success || !response.data) {
    throw new Error(
      response.message || 'Không thể lấy danh sách tài liệu riêng tư',
    );
  }

  return response.data;
};

export const getAllDocuments = async (
  params: AllDocumentsParams = {},
): Promise<PrivateDocumentsResponse> => {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.categoryIds && params.categoryIds.length > 0) {
    searchParams.set('categoryIds', params.categoryIds.join(','));
  }
  if (params.isPublic !== undefined && params.isPublic !== 'all') {
    searchParams.set('isPublic', String(params.isPublic));
  }
  if (
    params.moderationStatus !== undefined &&
    params.moderationStatus !== 'all'
  ) {
    searchParams.set('moderationStatus', params.moderationStatus);
  }
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const queryString = searchParams.toString();
  const endpoint = `/admin/documents/all${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<PrivateDocumentsResponse>(endpoint);

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể lấy danh sách tài liệu');
  }

  return response.data;
};
