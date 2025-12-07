import type { ApiResponse } from '@/types/api.types';
import { apiClient } from '@/utils/api-client';

export const BOOKMARKS_UPDATED_EVENT = 'bookmarks:updated';
const emitBookmarksUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BOOKMARKS_UPDATED_EVENT));
  }
};
export interface BookmarkWithDocument {
  id: string;
  userId: string;
  documentId: string;
  folderId?: string | null;
  notes?: string;
  createdAt: string;
  folder?: {
    id: string;
    name: string;
  } | null;
  document: {
    id: string;
    title: string;
    description?: string;
    tags: string[];
    language: string;
    isPublic: boolean;
    isPremium: boolean;
    isApproved: boolean;
    createdAt: string;
    downloadCount: number;
    viewCount: number;
    averageRating: number;
    totalRatings: number;
    category: {
      id: string;
      name: string;
      icon?: string | null;
    };
    uploader: {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      avatar?: string | null;
    };
  };
}

export interface GetBookmarksParams {
  folderId?: string;
  search?: string;
  documentId?: string;
}

export interface CreateBookmarkPayload {
  documentId: string;
  folderId?: string;
  notes?: string;
  isFromApiKey?: boolean;
}

export interface BookmarkStats {
  total: number;
  uncategorized: number;
  folders: Array<{
    id: string;
    name: string;
    count: number;
  }>;
}

export const getUserBookmarks = async (
  params?: GetBookmarksParams,
): Promise<BookmarkWithDocument[]> => {
  const response: ApiResponse<BookmarkWithDocument[]> = await apiClient.get<
    BookmarkWithDocument[]
  >('/bookmarks', {
    params,
  });

  if (!response.success) {
    throw new Error(response.message || 'Không thể tải danh sách bookmark');
  }

  if (!response.data) {
    return [];
  }

  return response.data;
};

export const createBookmark = async (
  payload: CreateBookmarkPayload,
  apiKey?: string,
): Promise<BookmarkWithDocument> => {
  const response = await apiClient.post<BookmarkWithDocument>(
    '/bookmarks',
    payload,
    {
      params: apiKey ? { apiKey } : undefined,
    },
  );

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể thêm bookmark');
  }

  emitBookmarksUpdated();
  return response.data;
};

export const deleteBookmark = async (bookmarkId: string): Promise<void> => {
  const response = await apiClient.delete(`/bookmarks/${bookmarkId}`);

  if (!response.success) {
    throw new Error(response.message || 'Không thể xóa bookmark');
  }

  emitBookmarksUpdated();
};

export const getBookmarkStats = async (): Promise<BookmarkStats> => {
  const response = await apiClient.get<BookmarkStats>('/bookmarks/stats');

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể tải thống kê bookmark');
  }

  return response.data;
};
