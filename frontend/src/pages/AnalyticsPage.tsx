import { BarChart3, Download, Eye, FileText, Star, TrendingUp, Users } from 'lucide-react';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type AnalyticsData, getAnalytics } from '@/services/analytics.service';
import { formatDate } from '@/utils/date';
import { getLanguageName } from '@/utils/language';

const DEFAULT_ANALYTICS: AnalyticsData = {
  timeframe: {
    range: '30d',
    startDate: new Date(0).toISOString(),
    endDate: new Date(0).toISOString(),
  },
  totalDocuments: 0,
  totalDownloads: 0,
  totalViews: 0,
  averageRating: 0,
  monthlyGrowth: 0,
  topCategories: [],
  topLanguages: [],
  topDocuments: [],
  monthlyStats: [],
  userStats: {
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    userGrowth: 0,
  },
};

const formatNumber = (num?: number | null) => {
  const value = typeof num === 'number' ? num : 0;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
};

const clampPercentage = (value: number) =>
  Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const calculateGrowth = (current?: number | null, previous?: number | null) => {
  const currentValue = typeof current === 'number' ? current : 0;
  const previousValue = typeof previous === 'number' ? previous : 0;

  if (previousValue > 0) {
    return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
  }

  return currentValue > 0 ? 100 : 0;
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (rangeValue: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAnalytics(rangeValue);
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics', err);
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu phân tích');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(timeRange);
  }, [timeRange, loadAnalytics]);

  const data = analyticsData ?? DEFAULT_ANALYTICS;

  const activeUsersPercentage = useMemo(() => {
    if (!data.userStats.totalUsers) {
      return 0;
    }
    return clampPercentage((data.userStats.activeUsers / data.userStats.totalUsers) * 100);
  }, [data.userStats.activeUsers, data.userStats.totalUsers]);

  const { downloadsGrowth, viewsGrowth } = useMemo(() => {
    if (data.monthlyStats.length === 0) {
      return { downloadsGrowth: 0, viewsGrowth: 0 };
    }

    const latest = data.monthlyStats[data.monthlyStats.length - 1];
    const previous =
      data.monthlyStats.length > 1 ? data.monthlyStats[data.monthlyStats.length - 2] : undefined;

    return {
      downloadsGrowth: calculateGrowth(latest?.downloads, previous?.downloads),
      viewsGrowth: calculateGrowth(latest?.views, previous?.views),
    };
  }, [data.monthlyStats]);

  const ratingValue = Number.isFinite(data.averageRating) ? data.averageRating : 0;
  const monthlyGrowthValue = Number.isFinite(data.monthlyGrowth) ? data.monthlyGrowth : 0;

  const timeframeLabel = `${formatDate(data.timeframe.startDate)} → ${formatDate(data.timeframe.endDate)}`;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Thông tin chi tiết và số liệu hiệu suất nền tảng</p>
          <Badge variant="outline" className="mt-2 text-xs font-normal">
            {timeframeLabel}
          </Badge>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange} disabled={isLoading}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Chọn khoảng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 ngày qua</SelectItem>
            <SelectItem value="30d">30 ngày qua</SelectItem>
            <SelectItem value="90d">90 ngày qua</SelectItem>
            <SelectItem value="1y">Năm qua</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Không thể tải dữ liệu phân tích</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng tài liệu</p>
                <p className="text-2xl font-bold">{formatNumber(data.totalDocuments)}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-500">
                {monthlyGrowthValue >= 0 ? '+' : ''}
                {monthlyGrowthValue}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng lượt tải</p>
                <p className="text-2xl font-bold">{formatNumber(data.totalDownloads)}</p>
              </div>
              <Download className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-500">
                {downloadsGrowth >= 0 ? '+' : ''}
                {downloadsGrowth}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng lượt xem</p>
                <p className="text-2xl font-bold">{formatNumber(data.totalViews)}</p>
              </div>
              <Eye className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-500">
                {viewsGrowth >= 0 ? '+' : ''}
                {viewsGrowth}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Đánh giá trung bình</p>
                <p className="text-2xl font-bold">{ratingValue.toFixed(1)}</p>
              </div>
              <Star className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Đánh giá trung bình toàn nền tảng</p>
          </CardContent>
        </Card>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng người dùng</p>
                <p className="text-2xl font-bold">{formatNumber(data.userStats.totalUsers)}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Người dùng hoạt động</p>
                <p className="text-2xl font-bold">{formatNumber(data.userStats.activeUsers)}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <Progress value={activeUsersPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Người dùng mới</p>
                <p className="text-2xl font-bold">{formatNumber(data.userStats.newUsers)}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-500">
                {data.userStats.userGrowth >= 0 ? '+' : ''}
                {data.userStats.userGrowth}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tăng trưởng người dùng</p>
                <p className="text-2xl font-bold">
                  {data.userStats.userGrowth >= 0 ? '+' : ''}
                  {data.userStats.userGrowth}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Danh mục hàng đầu</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu danh mục nào.</p>
            ) : (
              <div className="space-y-4">
                {data.topCategories.map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <span className="text-lg">{category.icon}</span>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">{category.count} tài liệu</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{category.percentage}%</p>
                      <Progress
                        value={clampPercentage(category.percentage)}
                        className="w-20 h-2 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Languages */}
        <Card>
          <CardHeader>
            <CardTitle>Ngôn ngữ hàng đầu</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topLanguages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu ngôn ngữ nào.</p>
            ) : (
              <div className="space-y-4">
                {data.topLanguages.map((language, index) => (
                  <div key={language.code} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{getLanguageName(language.code)}</p>
                        <p className="text-sm text-muted-foreground">{language.count} tài liệu</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{language.percentage}%</p>
                      <Progress
                        value={clampPercentage(language.percentage)}
                        className="w-20 h-2 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Tài liệu hoạt động hàng đầu</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu hiệu suất tài liệu.</p>
          ) : (
            <div className="space-y-4">
              {data.topDocuments.map((document, index) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-primary w-8">#{index + 1}</span>
                    <div className="flex-1">
                      <Link
                        to={`/documents/${document.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {document.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {document.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getLanguageName(document.language)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      <span>{formatNumber(document.downloads)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{formatNumber(document.views)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      <span>{document.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng hàng tháng</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu xu hướng hàng tháng.</p>
          ) : (
            <div className="space-y-4">
              {data.monthlyStats.map((stat) => (
                <div key={stat.month} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 text-center">
                      <p className="font-medium">{stat.month}</p>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Lượt tải</p>
                        <p className="font-medium">{formatNumber(stat.downloads)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Lượt xem</p>
                        <p className="font-medium">{formatNumber(stat.views)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Tài liệu</p>
                        <p className="font-medium">{stat.documents}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
