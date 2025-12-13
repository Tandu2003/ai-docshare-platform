import type { Comment } from '@/types/database.types';
import { apiClient } from '@/utils/api-client';

export interface AdminComment extends Omit<Comment, 'document' | 'parent'> {
  readonly document: {
    readonly id: string;
    readonly title: string;
  };
  readonly parent: {
    readonly id: string;
    readonly content: string;
  } | null;
  readonly _count: {
    readonly replies: number;
  };
}

export interface GetCommentsParams {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly documentId?: string;
  readonly userId?: string;
  readonly isDeleted?: boolean;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface CommentsResponse {
  readonly items: AdminComment[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface CommentStats {
  readonly total: number;
  readonly active: number;
  readonly deleted: number;
  readonly withReplies: number;
  readonly averageLikes: number;
}

class AdminCommentService {
  async getComments(params: GetCommentsParams = {}): Promise<CommentsResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.documentId) searchParams.set('documentId', params.documentId);
    if (params.userId) searchParams.set('userId', params.userId);
    if (typeof params.isDeleted === 'boolean') {
      searchParams.set('isDeleted', String(params.isDeleted));
    }
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const queryString = searchParams.toString();
    const endpoint = `/admin/comments${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<AdminComment[]>(endpoint);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể lấy danh sách bình luận');
    }

    // Transform backend response format to frontend expected format
    // Backend returns: { success: true, data: [...comments...], meta: { page, limit, total, totalPages } }
    // Frontend expects: { items: [...comments...], total, page, limit, totalPages }
    const comments = Array.isArray(response.data) ? response.data : [];
    const meta = response.meta;

    return {
      items: comments,
      total: meta?.total ?? 0,
      page: meta?.page ?? 1,
      limit: meta?.limit ?? 20,
      totalPages: meta?.totalPages ?? 0,
    };
  }

  async getCommentById(id: string): Promise<AdminComment> {
    const response = await apiClient.get<AdminComment>(`/admin/comments/${id}`);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể lấy chi tiết bình luận');
    }

    return response.data;
  }

  async deleteComment(id: string, hardDelete: boolean = false): Promise<void> {
    const endpoint = `/admin/comments/${id}${hardDelete ? '?hard=true' : ''}`;

    const response = await apiClient.delete(endpoint);

    if (!response.success) {
      throw new Error(response.message || 'Không thể xóa bình luận');
    }
  }

  async restoreComment(id: string): Promise<void> {
    const response = await apiClient.put(`/admin/comments/${id}/restore`);

    if (!response.success) {
      throw new Error(response.message || 'Không thể khôi phục bình luận');
    }
  }

  async getCommentStats(): Promise<CommentStats> {
    const response = await apiClient.get<CommentStats>('/admin/comments/stats');

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể lấy thống kê bình luận');
    }

    return response.data;
  }
}

export const adminCommentService = new AdminCommentService();
