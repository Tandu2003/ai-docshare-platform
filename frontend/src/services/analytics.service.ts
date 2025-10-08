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
