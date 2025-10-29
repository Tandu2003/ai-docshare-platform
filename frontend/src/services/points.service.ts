import { apiClient } from '@/utils/api-client';

export interface PointTransaction {
  id: string;
  userId: string;
  documentId?: string | null;
  amount: number;
  type: 'EARN' | 'SPEND' | 'ADJUST';
  reason: 'UPLOAD_REWARD' | 'DOWNLOAD_COST' | 'ADMIN_ADJUST';
  balanceAfter: number;
  note?: string | null;
  performedById?: string | null;
  isBypass: boolean;
  createdAt: string;
}

export interface TransactionsResponse {
  items: PointTransaction[];
  total: number;
  page: number;
  limit: number;
}

class PointsService {
  private baseUrl = '/points';

  async getBalance(): Promise<{ balance: number }> {
    const res = await apiClient.get(`${this.baseUrl}/balance`);
    return res.data as any;
  }

  async getTransactions(
    page: number = 1,
    limit: number = 10,
  ): Promise<TransactionsResponse> {
    const res = await apiClient.get(`${this.baseUrl}/transactions`, {
      params: { page, limit },
    });
    return res.data as any;
  }

  async adminAdjust(
    userId: string,
    delta: number,
    note?: string,
  ): Promise<{ balance: number }> {
    const res = await apiClient.post(`${this.baseUrl}/admin/adjust`, {
      userId,
      delta,
      note,
    });
    return res.data as any;
  }

  async adminSet(
    userId: string,
    points: number,
    note?: string,
  ): Promise<{ balance: number }> {
    const res = await apiClient.post(`${this.baseUrl}/admin/set`, {
      userId,
      points,
      note,
    });
    return res.data as any;
  }
}

export const pointsService = new PointsService();
