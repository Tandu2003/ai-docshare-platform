import { apiClient } from '@/utils/api-client';
import type {
  DashboardActivity,
  DashboardCategory,
  DashboardDocument,
  DashboardNotification,
  DashboardOverview,
  DashboardUserSummary,
} from '@/types';

interface DashboardOverviewApiResponse {
  totalDocuments: number;
  totalUsers: number;
  totalDownloads: number;
  totalViews: number;
  recentDocuments: DashboardDocumentApiResponse[];
  popularCategories: DashboardCategoryApiResponse[];
  userActivity: DashboardActivityApiResponse[];
  recentNotifications: DashboardNotificationApiResponse[];
}

interface DashboardDocumentApiResponse {
  id: string;
  title: string;
  description?: string | null;
  uploaderId: string;
  categoryId: string;
  downloadCount: number;
  viewCount: number;
  averageRating: number;
  totalRatings: number;
  isPublic: boolean;
  isPremium: boolean;
  isApproved: boolean;
  isDraft: boolean;
  tags?: string[] | null;
  language: string;
  createdAt: string;
  updatedAt: string;
  uploader: DashboardUserSummaryApiResponse;
  category: {
    id: string;
    name: string;
    icon?: string | null;
    description?: string | null;
    color?: string | null;
  };
}

interface DashboardUserSummaryApiResponse {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
}

interface DashboardCategoryApiResponse {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  color?: string | null;
  documentCount: number;
  totalDownloads: number;
  totalViews: number;
}

interface DashboardActivityApiResponse {
  id: string;
  userId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: DashboardUserSummaryApiResponse | null;
}

interface DashboardNotificationApiResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  user: DashboardUserSummaryApiResponse;
}

const mapUserSummary = (user?: DashboardUserSummaryApiResponse | null): DashboardUserSummary => ({
  id: user?.id ?? '',
  username: user?.username ?? undefined,
  firstName: user?.firstName ?? null,
  lastName: user?.lastName ?? null,
  avatar: user?.avatar ?? null,
});

const mapDocument = (document: DashboardDocumentApiResponse): DashboardDocument => ({
  id: document.id,
  title: document.title,
  description: document.description ?? null,
  uploaderId: document.uploaderId,
  categoryId: document.categoryId,
  downloadCount: document.downloadCount,
  viewCount: document.viewCount,
  averageRating: document.averageRating ?? 0,
  totalRatings: document.totalRatings ?? 0,
  isPublic: document.isPublic,
  isPremium: document.isPremium,
  isApproved: document.isApproved,
  isDraft: document.isDraft,
  tags: document.tags ?? [],
  language: document.language,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  uploader: mapUserSummary(document.uploader),
  category: {
    id: document.category.id,
    name: document.category.name,
    icon: document.category.icon ?? null,
    description: document.category.description ?? null,
    color: document.category.color ?? null,
  },
});

const mapCategory = (category: DashboardCategoryApiResponse): DashboardCategory => ({
  id: category.id,
  name: category.name,
  icon: category.icon ?? null,
  description: category.description ?? null,
  color: category.color ?? null,
  documentCount: category.documentCount,
  totalDownloads: category.totalDownloads,
  totalViews: category.totalViews,
});

const mapActivity = (activity: DashboardActivityApiResponse): DashboardActivity => ({
  id: activity.id,
  userId: activity.userId ?? undefined,
  action: activity.action,
  resourceType: activity.resourceType ?? undefined,
  resourceId: activity.resourceId ?? undefined,
  ipAddress: activity.ipAddress ?? undefined,
  userAgent: activity.userAgent ?? undefined,
  metadata: activity.metadata ?? undefined,
  createdAt: activity.createdAt,
  user: activity.user ? mapUserSummary(activity.user) : undefined,
});

const mapNotification = (
  notification: DashboardNotificationApiResponse
): DashboardNotification => ({
  id: notification.id,
  userId: notification.userId,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  data: notification.data ?? undefined,
  isRead: notification.isRead,
  readAt: notification.readAt ?? undefined,
  createdAt: notification.createdAt,
  user: mapUserSummary(notification.user),
});

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const response = await apiClient.get<DashboardOverviewApiResponse>('/analytics/dashboard');

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể tải dữ liệu tổng quan dashboard');
  }

  const data = response.data;

  return {
    totalDocuments: data.totalDocuments,
    totalUsers: data.totalUsers,
    totalDownloads: data.totalDownloads,
    totalViews: data.totalViews,
    recentDocuments: data.recentDocuments.map(mapDocument),
    popularCategories: data.popularCategories.map(mapCategory),
    userActivity: data.userActivity.map(mapActivity),
    recentNotifications: data.recentNotifications.map(mapNotification),
  };
};
