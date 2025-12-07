import type { DocumentModerationStatus } from './database.types';

export interface DashboardUserSummary {
  id: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
}
export interface DashboardCategory {
  id: string;
  name: string;
  icon?: string | null;
  documentCount: number;
  totalDownloads: number;
  totalViews: number;
  description?: string | null;
  color?: string | null;
}

export interface DashboardDocument {
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
  moderationStatus: DocumentModerationStatus;
  moderatedById?: string | null;
  moderatedAt?: string | null;
  moderationNotes?: string | null;
  rejectionReason?: string | null;
  tags: string[];
  language: string;
  createdAt: string;
  updatedAt: string;
  uploader: DashboardUserSummary;
  category: {
    id: string;
    name: string;
    icon?: string | null;
    description?: string | null;
    color?: string | null;
  };
}

export interface DashboardActivity {
  id: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  timestamp: string;
  description: string;
  user?: DashboardUserSummary;
}

export interface DashboardNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  user: DashboardUserSummary;
}

export interface DashboardOverview {
  totalDocuments: number;
  totalUsers: number;
  totalDownloads: number;
  totalViews: number;
  averageRating: number;
  recentDocuments: DashboardDocument[];
  popularCategories: DashboardCategory[];
  userActivity: DashboardActivity[];
  recentNotifications: DashboardNotification[];

  // Admin-specific stats
  newUsersThisMonth?: number;
  newDocumentsThisMonth?: number;
  downloadsThisMonth?: number;
  viewsThisMonth?: number;
  unverifiedUsers?: number;
  pendingReports?: number;
}
