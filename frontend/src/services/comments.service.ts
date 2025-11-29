import type { Comment } from '@/types';
import { apiClient } from '@/utils/api-client';

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export class CommentsService {
  static async getComments(documentId: string): Promise<Comment[]> {
    const response = await apiClient.get<Comment[]>(
      `/documents/${documentId}/comments`,
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể lấy bình luận');
    }
    return response.data;
  }

  static async addComment(
    documentId: string,
    payload: CreateCommentRequest,
  ): Promise<Comment> {
    const response = await apiClient.post<Comment>(
      `/documents/${documentId}/comments`,
      payload,
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể thêm bình luận');
    }
    return response.data;
  }

  static async likeComment(
    documentId: string,
    commentId: string,
  ): Promise<{ likesCount: number; isLiked: boolean }> {
    const response = await apiClient.post<{
      likesCount: number;
      isLiked: boolean;
    }>(`/documents/${documentId}/comments/${commentId}/like`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể thích bình luận');
    }
    return response.data;
  }

  static async editComment(
    documentId: string,
    commentId: string,
    content: string,
  ): Promise<void> {
    const response = await apiClient.post(
      `/documents/${documentId}/comments/${commentId}`,
      {
        content,
      },
    );
    if (!response.success) {
      throw new Error(response.message || 'Không thể sửa bình luận');
    }
  }

  static async deleteComment(
    documentId: string,
    commentId: string,
  ): Promise<void> {
    const response = await apiClient.delete(
      `/documents/${documentId}/comments/${commentId}`,
    );
    if (!response.success) {
      throw new Error(response.message || 'Không thể xóa bình luận');
    }
  }
}
