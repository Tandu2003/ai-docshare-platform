import { apiClient } from '@/utils/api-client';

export interface ShareLinkHistoryItem {
  readonly id: string;
  readonly documentId: string;
  readonly token: string;
  readonly expiresAt: string;
  readonly isRevoked: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly document: {
    readonly id: string;
    readonly title: string;
    readonly uploaderId: string;
  };
  readonly createdBy: {
    readonly id: string;
    readonly username: string;
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
  };
  readonly shareUrl: string;
  readonly isExpired: boolean;
}

export interface GetShareLinksParams {
  readonly page?: number;
  readonly limit?: number;
  readonly documentId?: string;
  readonly createdById?: string;
  readonly isRevoked?: boolean;
  readonly isExpired?: boolean;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface ShareLinksResponse {
  readonly items: ShareLinkHistoryItem[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface ShareLinkStats {
  readonly total: number;
  readonly active: number;
  readonly revoked: number;
  readonly expired: number;
}

class ShareLinkHistoryService {
  async getMyShareLinks(
    params: GetShareLinksParams = {},
  ): Promise<ShareLinksResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.documentId) searchParams.set('documentId', params.documentId);
    if (params.createdById) searchParams.set('createdById', params.createdById);
    if (typeof params.isRevoked === 'boolean') {
      searchParams.set('isRevoked', String(params.isRevoked));
    }
    if (typeof params.isExpired === 'boolean') {
      searchParams.set('isExpired', String(params.isExpired));
    }
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const queryString = searchParams.toString();
    const endpoint = `/documents/share-links/my${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await apiClient.get<ShareLinkHistoryItem[]>(endpoint);

    if (!response.success || !response.data) {
      throw new Error(
        response.message || 'Không thể lấy lịch sử liên kết chia sẻ',
      );
    }

    const shareLinks = Array.isArray(response.data) ? response.data : [];
    const meta = response.meta;

    return {
      items: shareLinks,
      total: meta?.total ?? 0,
      page: meta?.page ?? 1,
      limit: meta?.limit ?? 20,
      totalPages: meta?.totalPages ?? 0,
    };
  }

  async getAllShareLinks(
    params: GetShareLinksParams = {},
  ): Promise<ShareLinksResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.documentId) searchParams.set('documentId', params.documentId);
    if (params.createdById) searchParams.set('createdById', params.createdById);
    if (typeof params.isRevoked === 'boolean') {
      searchParams.set('isRevoked', String(params.isRevoked));
    }
    if (typeof params.isExpired === 'boolean') {
      searchParams.set('isExpired', String(params.isExpired));
    }
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const queryString = searchParams.toString();
    const endpoint = `/admin/share-links${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ShareLinkHistoryItem[]>(endpoint);

    if (!response.success || !response.data) {
      throw new Error(
        response.message || 'Không thể lấy danh sách liên kết chia sẻ',
      );
    }

    const shareLinks = Array.isArray(response.data) ? response.data : [];
    const meta = response.meta;

    return {
      items: shareLinks,
      total: meta?.total ?? 0,
      page: meta?.page ?? 1,
      limit: meta?.limit ?? 20,
      totalPages: meta?.totalPages ?? 0,
    };
  }

  async getShareLinkById(id: string): Promise<ShareLinkHistoryItem> {
    const response = await apiClient.get<ShareLinkHistoryItem>(
      `/admin/share-links/${id}`,
    );

    if (!response.success || !response.data) {
      throw new Error(
        response.message || 'Không thể lấy chi tiết liên kết chia sẻ',
      );
    }

    return response.data;
  }

  async revokeShareLink(id: string): Promise<void> {
    const response = await apiClient.delete(`/admin/share-links/${id}`);

    if (!response.success) {
      throw new Error(response.message || 'Không thể thu hồi liên kết chia sẻ');
    }
  }

  async getShareLinkStats(): Promise<ShareLinkStats> {
    const response = await apiClient.get<ShareLinkStats>(
      '/admin/share-links/stats',
    );

    if (!response.success || !response.data) {
      throw new Error(
        response.message || 'Không thể lấy thống kê liên kết chia sẻ',
      );
    }

    return response.data;
  }
}

export const shareLinkHistoryService = new ShareLinkHistoryService();
