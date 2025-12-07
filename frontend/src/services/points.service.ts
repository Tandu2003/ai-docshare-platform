import { apiClient } from '@/utils/api-client';
export interface PointTransactionDocument {
  id: string;
  title: string;
}
export interface PointTransactionPerformedBy {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
}
export interface PointTransactionUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
}

export interface PointTransaction {
  id: string;
  userId: string;
  documentId?: string | null;
  amount: number;
  type: 'EARN' | 'SPEND' | 'ADJUST';
  reason:
    | 'UPLOAD_REWARD'
    | 'DOWNLOAD_COST'
    | 'DOWNLOAD_REWARD'
    | 'ADMIN_ADJUST';
  balanceAfter: number;
  note?: string | null;
  performedById?: string | null;
  isBypass: boolean;
  createdAt: string;
  document?: PointTransactionDocument | null;
  performedBy?: PointTransactionPerformedBy | null;
  user?: PointTransactionUser;
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
    // apiClient.get already returns response.data, so we return it directly
    const res = await apiClient.get<{ balance: number }>(
      `${this.baseUrl}/balance`,
    );
    const data = (res as any)?.data ?? res;
    return data as { balance: number };
  }

  async getTransactions(
    page: number = 1,
    limit: number = 10,
  ): Promise<TransactionsResponse> {
    const res = await apiClient.get<TransactionsResponse>(
      `${this.baseUrl}/transactions`,
      {
        params: { page, limit },
      },
    );
    const data = (res as any)?.data ?? res;
    return data as TransactionsResponse;
  }

  async adminGetTransactions(params: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    type?: PointTransaction['type'];
    reason?: PointTransaction['reason'];
    from?: string;
    to?: string;
  }): Promise<TransactionsResponse> {
    const res = await apiClient.get<TransactionsResponse>(
      `${this.baseUrl}/admin/transactions`,
      {
        params,
      },
    );
    const data = (res as any)?.data ?? res;
    return data as TransactionsResponse;
  }

  async adminAdjust(
    userId: string,
    delta: number,
    note?: string,
  ): Promise<{ balance: number }> {
    const res = await apiClient.post<{ balance: number }>(
      `${this.baseUrl}/admin/adjust`,
      {
        userId,
        delta,
        note,
      },
    );
    const data = (res as any)?.data ?? res;
    return data as { balance: number };
  }

  async adminSet(
    userId: string,
    points: number,
    note?: string,
  ): Promise<{ balance: number }> {
    const res = await apiClient.post<{ balance: number }>(
      `${this.baseUrl}/admin/set`,
      {
        userId,
        points,
        note,
      },
    );
    const data = (res as any)?.data ?? res;
    return data as { balance: number };
  }
}

export const pointsService = new PointsService();
