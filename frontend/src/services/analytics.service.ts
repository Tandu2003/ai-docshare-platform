import { apiClient } from '@/utils/api-client';

export interface AnalyticsTimeframe {
  range: string;
  startDate: string;
  endDate: string;
}

export interface AnalyticsCategory {
  name: string;
  icon: string;
  count: number;
  percentage: number;
}

export interface AnalyticsLanguage {
  code: string;
  count: number;
  percentage: number;
}

export interface AnalyticsDocument {
  id: string;
  title: string;
  downloads: number;
  views: number;
  rating: number;
  category: string;
  language: string;
}

export interface AnalyticsMonthlyStat {
  month: string;
  downloads: number;
  views: number;
  documents: number;
}

export interface AnalyticsUserStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowth: number;
}

export interface AnalyticsData {
  timeframe: AnalyticsTimeframe;
  totalDocuments: number;
  totalDownloads: number;
  totalViews: number;
  averageRating: number;
  monthlyGrowth: number;
  topCategories: AnalyticsCategory[];
  topLanguages: AnalyticsLanguage[];
  topDocuments: AnalyticsDocument[];
  monthlyStats: AnalyticsMonthlyStat[];
  userStats: AnalyticsUserStats;
}

export const getAnalytics = async (range: string): Promise<AnalyticsData> => {
  const response = await apiClient.get<AnalyticsData>('/analytics', {
    params: { range },
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể tải dữ liệu phân tích');
  }

  return response.data;
};

export interface TrendingStats {
  totalTrending: number;
  averageScore: number;
  topGrowth: number;
}

export interface TrendingDocumentCategory {
  id: string;
  name: string;
  icon: string;
}

export interface TrendingDocumentUploader {
  firstName?: string | null;
  lastName?: string | null;
}

export interface TrendingDocument {
  id: string;
  title: string;
  description?: string | null;
  language: string;
  category?: TrendingDocumentCategory;
  tags: string[];
  uploader?: TrendingDocumentUploader | null;
  downloadCount: number;
  viewCount: number;
  averageRating: number;
  createdAt: string;
  isPublic: boolean;
  isPremium: boolean;
  isApproved: boolean;
  trendingScore: number;
  trendingChange: number;
  lastUpdated: string;
}

export interface TrendingAnalyticsData {
  timeframe: AnalyticsTimeframe;
  stats: TrendingStats;
  documents: TrendingDocument[];
}

export const getTrendingAnalytics = async (range: string): Promise<TrendingAnalyticsData> => {
  const response = await apiClient.get<TrendingAnalyticsData>('/analytics/trending', {
    params: { range },
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể tải dữ liệu trending');
  }

  return response.data;
};

export interface TopRatedFilters {
  minRatings: number;
}

export interface TopRatedStats {
  totalDocuments: number;
  averageRating: number;
  totalRatings: number;
  perfectCount: number;
}

export interface TopRatedDocument {
  id: string;
  title: string;
  description?: string | null;
  language: string;
  category?: {
    id: string;
    name: string;
    icon: string;
  };
  tags: string[];
  uploader?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  downloadCount: number;
  viewCount: number;
  averageRating: number;
  ratingCount: number;
  createdAt: string;
  isPublic: boolean;
  isPremium: boolean;
  isApproved: boolean;
  rank: number;
}

export interface TopRatedAnalyticsData {
  timeframe: AnalyticsTimeframe;
  filters: TopRatedFilters;
  stats: TopRatedStats;
  documents: TopRatedDocument[];
}

export const getTopRatedAnalytics = async (
  range: string,
  minRatings: number
): Promise<TopRatedAnalyticsData> => {
  const response = await apiClient.get<TopRatedAnalyticsData>('/analytics/top-rated', {
    params: { range, minRatings },
  });

  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể tải dữ liệu top rated');
  }

  return response.data;
};
