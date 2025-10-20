import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  BarChart3,
  Download,
  Eye,
  FileText,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/loading-skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getAnalytics,
  getDailyActivity,
  getTopReport,
  type AnalyticsData,
  type DailyActivityData,
  type TopReportData,
} from '@/services/analytics.service';
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
    return Number(
      (((currentValue - previousValue) / previousValue) * 100).toFixed(1),
    );
  }

  return currentValue > 0 ? 100 : 0;
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null,
  );
  const [dailyData, setDailyData] = useState<DailyActivityData | null>(null);
  const [topDownloads, setTopDownloads] = useState<TopReportData | null>(null);
  const [topViews, setTopViews] = useState<TopReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (rangeValue: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [analytics, daily, topDl, topVw] = await Promise.all([
        getAnalytics(rangeValue),
        getDailyActivity(rangeValue),
        getTopReport('downloads', rangeValue, 10),
        getTopReport('views', rangeValue, 10),
      ]);
      setAnalyticsData(analytics);
      setDailyData(daily);
      setTopDownloads(topDl);
      setTopViews(topVw);
    } catch (err) {
      console.error('Failed to load analytics', err);
      setError(
        err instanceof Error ? err.message : 'Không thể tải dữ liệu phân tích',
      );
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
    return clampPercentage(
      (data.userStats.activeUsers / data.userStats.totalUsers) * 100,
    );
  }, [data.userStats.activeUsers, data.userStats.totalUsers]);

  const { downloadsGrowth, viewsGrowth } = useMemo(() => {
    if (data.monthlyStats.length === 0) {
      return { downloadsGrowth: 0, viewsGrowth: 0 };
    }

    const latest = data.monthlyStats[data.monthlyStats.length - 1];
    const previous =
      data.monthlyStats.length > 1
        ? data.monthlyStats[data.monthlyStats.length - 2]
        : undefined;

    return {
      downloadsGrowth: calculateGrowth(latest?.downloads, previous?.downloads),
      viewsGrowth: calculateGrowth(latest?.views, previous?.views),
    };
  }, [data.monthlyStats]);

  // Lọc bỏ những ngày có tất cả 3 cột đều bằng 0
  const filteredDailyData = useMemo(() => {
    if (!dailyData || dailyData.days.length === 0) {
      return [];
    }

    return dailyData.days.filter(
      day => day.uploads > 0 || day.downloads > 0 || day.views > 0,
    );
  }, [dailyData]);

  const ratingValue = Number.isFinite(data.averageRating)
    ? data.averageRating
    : 0;
  const monthlyGrowthValue = Number.isFinite(data.monthlyGrowth)
    ? data.monthlyGrowth
    : 0;

  const timeframeLabel = `${formatDate(data.timeframe.startDate)} → ${formatDate(data.timeframe.endDate)}`;

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <BarChart3 className="text-primary h-8 w-8" />
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              Thông tin chi tiết và số liệu hiệu suất nền tảng
            </p>
          </div>
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
            disabled={isLoading}
          >
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
        <LoadingPage
          title=""
          description=""
          showStats={true}
          showTable={true}
          showList={true}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <BarChart3 className="text-primary h-8 w-8" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Thông tin chi tiết và số liệu hiệu suất nền tảng
          </p>
          <Badge variant="outline" className="mt-2 text-xs font-normal">
            {timeframeLabel}
          </Badge>
        </div>
        <Select
          value={timeRange}
          onValueChange={setTimeRange}
          disabled={isLoading}
        >
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng tài liệu
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(data.totalDocuments)}
                </p>
              </div>
              <FileText className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="mt-2 flex items-center">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
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
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng lượt tải
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(data.totalDownloads)}
                </p>
              </div>
              <Download className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="mt-2 flex items-center">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
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
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng lượt xem
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(data.totalViews)}
                </p>
              </div>
              <Eye className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="mt-2 flex items-center">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
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
                <p className="text-muted-foreground text-sm font-medium">
                  Đánh giá trung bình
                </p>
                <p className="text-2xl font-bold">{ratingValue.toFixed(1)}</p>
              </div>
              <Star className="text-muted-foreground h-8 w-8" />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Đánh giá trung bình toàn nền tảng
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng người dùng
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(data.userStats.totalUsers)}
                </p>
              </div>
              <Users className="text-muted-foreground h-8 w-8" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Người dùng hoạt động
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(data.userStats.activeUsers)}
                </p>
              </div>
              <Users className="text-muted-foreground h-8 w-8" />
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
                <p className="text-muted-foreground text-sm font-medium">
                  Người dùng mới
                </p>
                <p className="text-2xl font-bold">
                  {formatNumber(data.userStats.newUsers)}
                </p>
              </div>
              <Users className="text-muted-foreground h-8 w-8" />
            </div>
            <div className="mt-2 flex items-center">
              <TrendingUp className="mr-1 h-4 w-4 text-green-500" />
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
                <p className="text-muted-foreground text-sm font-medium">
                  Tăng trưởng người dùng
                </p>
                <p className="text-2xl font-bold">
                  {data.userStats.userGrowth >= 0 ? '+' : ''}
                  {data.userStats.userGrowth}%
                </p>
              </div>
              <TrendingUp className="text-muted-foreground h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Danh mục hàng đầu</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCategories.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Chưa có dữ liệu danh mục nào.
              </p>
            ) : (
              <div className="space-y-4">
                {data.topCategories.map((category, index) => (
                  <div
                    key={category.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6 text-sm font-medium">
                        #{index + 1}
                      </span>
                      <span className="text-lg">{category.icon}</span>
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {category.count} tài liệu
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{category.percentage}%</p>
                      <Progress
                        value={clampPercentage(category.percentage)}
                        className="mt-1 h-2 w-20"
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
              <p className="text-muted-foreground text-sm">
                Chưa có dữ liệu ngôn ngữ nào.
              </p>
            ) : (
              <div className="space-y-4">
                {data.topLanguages.map((language, index) => (
                  <div
                    key={language.code}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6 text-sm font-medium">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">
                          {getLanguageName(language.code)}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {language.count} tài liệu
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{language.percentage}%</p>
                      <Progress
                        value={clampPercentage(language.percentage)}
                        className="mt-1 h-2 w-20"
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
            <p className="text-muted-foreground text-sm">
              Chưa có dữ liệu hiệu suất tài liệu.
            </p>
          ) : (
            <div className="space-y-4">
              {data.topDocuments.map((document, index) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-primary w-8 text-lg font-bold">
                      #{index + 1}
                    </span>
                    <div className="flex-1">
                      <Link
                        to={`/documents/${document.id}`}
                        className="hover:text-primary font-medium transition-colors"
                      >
                        {document.title}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {document.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getLanguageName(document.language)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-6 text-sm">
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

      {/* Daily Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động theo ngày</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDailyData.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Chưa có dữ liệu hoạt động theo ngày.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Ngày</TableHead>
                  <TableHead className="text-center">Tải lên</TableHead>
                  <TableHead className="text-center">Tải xuống</TableHead>
                  <TableHead className="text-center">Lượt xem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDailyData.map(day => (
                  <TableRow key={day.date}>
                    <TableCell className="font-medium">{day.date}</TableCell>
                    <TableCell className="text-center">
                      {formatNumber(day.uploads)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatNumber(day.downloads)}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatNumber(day.views)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top Downloads / Top Views */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top tải xuống</CardTitle>
          </CardHeader>
          <CardContent>
            {!topDownloads || topDownloads.documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Chưa có dữ liệu top tải xuống.
              </p>
            ) : (
              <div className="space-y-3">
                {topDownloads.documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6 text-sm font-medium">
                        #{doc.rank}
                      </span>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="hover:text-primary font-medium transition-colors"
                      >
                        {doc.title}
                      </Link>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        <span>{formatNumber(doc.count)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{formatNumber(doc.views)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top lượt xem</CardTitle>
          </CardHeader>
          <CardContent>
            {!topViews || topViews.documents.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Chưa có dữ liệu top lượt xem.
              </p>
            ) : (
              <div className="space-y-3">
                {topViews.documents.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-6 text-sm font-medium">
                        #{doc.rank}
                      </span>
                      <Link
                        to={`/documents/${doc.id}`}
                        className="hover:text-primary font-medium transition-colors"
                      >
                        {doc.title}
                      </Link>
                    </div>
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{formatNumber(doc.count)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        <span>{formatNumber(doc.downloads)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng hàng tháng</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyStats.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Chưa có dữ liệu xu hướng hàng tháng.
            </p>
          ) : (
            <div className="space-y-4">
              {data.monthlyStats.map(stat => (
                <div
                  key={stat.month}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 text-center">
                      <p className="font-medium">{stat.month}</p>
                    </div>
                    <div className="grid flex-1 grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-muted-foreground text-sm">
                          Lượt tải
                        </p>
                        <p className="font-medium">
                          {formatNumber(stat.downloads)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-sm">
                          Lượt xem
                        </p>
                        <p className="font-medium">
                          {formatNumber(stat.views)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-sm">
                          Tài liệu
                        </p>
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
