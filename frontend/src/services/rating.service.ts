import { apiClient } from '@/utils/api-client';
export class RatingService {
  static async getUserRating(documentId: string): Promise<number> {
    const response = await apiClient.get<{ rating: number }>(
      `/documents/${documentId}/rating`,
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Không thể lấy đánh giá');
    }
    return response.data.rating || 0;
  }
  static async setUserRating(
    documentId: string,
    rating: number,
  ): Promise<void> {
    const response = await apiClient.post(`/documents/${documentId}/rating`, {
      rating,
    });
    if (!response.success) {
      throw new Error(response.message || 'Không thể cập nhật đánh giá');
    }
  }
}
