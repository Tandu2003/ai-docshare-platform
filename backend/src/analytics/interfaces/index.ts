export interface DashboardOverview {
  readonly totalDocuments: number;
  readonly totalUsers: number;
  readonly totalDownloads: number;
  readonly totalViews: number;
  readonly recentDocuments: RecentDocument[];
  readonly categoryStats: CategoryStat[];
  readonly activityLogs: ActivityLogItem[];
  readonly adminStats?: AdminStats;
}
export interface RecentDocument {
  readonly id: string;
  readonly title: string;
  readonly createdAt: Date;
  readonly downloadCount: number;
  readonly viewCount: number;
  readonly uploader: {
    readonly id: string;
    readonly username: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly avatar: string | null;
  };
  readonly category: {
    readonly id: string;
    readonly name: string;
    readonly icon: string | null;
    readonly color: string | null;
  } | null;
}

export interface CategoryStat {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly color: string | null;
  readonly documentCount: number;
  readonly downloadCount: number;
  readonly viewCount: number;
}

export interface ActivityLogItem {
  readonly id: string;
  readonly action: string;
  readonly description: string;
  readonly resourceType: string | null;
  readonly resourceId: string | null;
  readonly createdAt: Date;
  readonly user: {
    readonly id: string;
    readonly username: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly avatar: string | null;
  } | null;
}

export interface AdminStats {
  readonly newUsersThisMonth: number;
  readonly newDocumentsThisMonth: number;
  readonly downloadsThisMonth: number;
  readonly viewsThisMonth: number;
  readonly unverifiedUsers: number;
  readonly pendingReports: number;
}

export interface DocumentTrends {
  readonly range: string;
  readonly data: TrendDataPoint[];
  readonly summary: TrendSummary;
}

export interface TrendDataPoint {
  readonly date: string;
  readonly uploads: number;
  readonly downloads: number;
  readonly views: number;
}

export interface TrendSummary {
  readonly totalUploads: number;
  readonly totalDownloads: number;
  readonly totalViews: number;
  readonly uploadsChange: number;
  readonly downloadsChange: number;
  readonly viewsChange: number;
}

export interface UserAnalytics {
  readonly userId: string;
  readonly documentsUploaded: number;
  readonly totalDownloads: number;
  readonly totalViews: number;
  readonly averageRating: number;
  readonly topDocuments: TopDocument[];
}

export interface TopDocument {
  readonly id: string;
  readonly title: string;
  readonly downloadCount: number;
  readonly viewCount: number;
  readonly averageRating: number | null;
}

// Constants

export const ANALYTICS_RANGES = {
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d',
  YEAR: '1y',
} as const;

export const DEFAULT_ANALYTICS_RANGE = '30d';

export type AnalyticsRange =
  (typeof ANALYTICS_RANGES)[keyof typeof ANALYTICS_RANGES];
