import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Eye,
  FileText,
  Flame,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { LoadingPage } from '@/components/ui/loading-skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// Chart color palette
const CATEGORY_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

const formatNumber = (num?: number | null) => {
  const value = typeof num === 'number' ? num : 0;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
};

const formatCompactNumber = (num: number) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
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

// Chart configs
const activityChartConfig = {
  uploads: {
    label: 'Tải lên',
    color: 'hsl(var(--chart-1))',
  },
  downloads: {
    label: 'Tải xuống',
    color: 'hsl(var(--chart-2))',
  },
  views: {
    label: 'Lượt xem',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

const monthlyChartConfig = {
  downloads: {
    label: 'Tải xuống',
    color: 'hsl(var(--chart-1))',
  },
  views: {
    label: 'Lượt xem',
    color: 'hsl(var(--chart-2))',
  },
  documents: {
    label: 'Tài liệu',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;

export function AnalyticsPage(): ReactElement {
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

  // Prepare data for Pie Chart (Categories)
  const categoryPieData = useMemo(() => {
    return data.topCategories.map((cat, index) => ({
      name: cat.name,
      value: cat.count,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [data.topCategories]);

  // Prepare data for Language Bar Chart
  const languageBarData = useMemo(() => {
    return data.topLanguages.map((lang, index) => ({
      name: getLanguageName(lang.code),
      count: lang.count,
      percentage: lang.percentage,
      fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [data.topLanguages]);

  // Prepare Combined Activity Data for Area Chart
  const combinedActivityData = useMemo(() => {
    return filteredDailyData.slice(-14).map(day => ({
      date: day.date.split('-').slice(1).join('/'),
      uploads: day.uploads,
      downloads: day.downloads,
      views: day.views,
    }));
  }, [filteredDailyData]);

  // Top documents comparison data
  const topDocsComparisonData = useMemo(() => {
    return data.topDocuments.slice(0, 5).map(doc => ({
      name: doc.title.length > 20 ? doc.title.slice(0, 20) + '...' : doc.title,
      downloads: doc.downloads,
      views: doc.views,
      rating: (doc.ratingsCount ?? 0) > 0 && doc.rating > 0 ? doc.rating : 0,
      ratingsCount: doc.ratingsCount ?? 0,
      hasRating: (doc.ratingsCount ?? 0) > 0 && doc.rating > 0,
    }));
  }, [data.topDocuments]);

  // Radar chart data - Performance metrics
  const performanceRadarData = useMemo(() => {
    const maxDocs = Math.max(data.totalDocuments, 1);
    const maxDownloads = Math.max(data.totalDownloads, 1);
    const maxViews = Math.max(data.totalViews, 1);
    const maxUsers = Math.max(data.userStats.totalUsers, 1);

    return [
      {
        metric: 'Tài liệu',
        value: Math.min(100, (data.totalDocuments / maxDocs) * 100),
        fullMark: 100,
      },
      {
        metric: 'Lượt tải',
        value: Math.min(100, (data.totalDownloads / maxDownloads) * 100),
        fullMark: 100,
      },
      {
        metric: 'Lượt xem',
        value: Math.min(100, (data.totalViews / maxViews) * 100),
        fullMark: 100,
      },
      {
        metric: 'Người dùng',
        value: Math.min(100, (data.userStats.activeUsers / maxUsers) * 100),
        fullMark: 100,
      },
      {
        metric: 'Đánh giá',
        value: (data.averageRating / 5) * 100,
        fullMark: 100,
      },
      {
        metric: 'Tăng trưởng',
        value: Math.min(100, Math.max(0, 50 + data.monthlyGrowth)),
        fullMark: 100,
      },
    ];
  }, [data]);

  // Radial bar data for overall health
  const platformHealthData = useMemo(() => {
    const engagementRate =
      data.totalDocuments > 0
        ? ((data.totalDownloads + data.totalViews) /
            (data.totalDocuments * 10)) *
          100
        : 0;
    const userActivity = activeUsersPercentage;
    const contentQuality = (data.averageRating / 5) * 100;
    const growth = Math.max(0, Math.min(100, 50 + data.monthlyGrowth));

    return [
      {
        name: 'Tương tác',
        value: Math.min(100, engagementRate),
        fill: 'hsl(var(--chart-1))',
      },
      {
        name: 'Hoạt động',
        value: userActivity,
        fill: 'hsl(var(--chart-2))',
      },
      {
        name: 'Chất lượng',
        value: contentQuality,
        fill: 'hsl(var(--chart-3))',
      },
      {
        name: 'Tăng trưởng',
        value: growth,
        fill: 'hsl(var(--chart-4))',
      },
    ];
  }, [data, activeUsersPercentage]);

  // Weekly comparison data
  const weeklyComparisonData = useMemo(() => {
    if (filteredDailyData.length < 7) return [];

    const weeks: Array<{
      week: string;
      uploads: number;
      downloads: number;
      views: number;
    }> = [];
    let currentWeek = {
      week: 'Tuần 1',
      uploads: 0,
      downloads: 0,
      views: 0,
    };
    let weekCount = 1;
    let dayCount = 0;

    filteredDailyData.forEach(day => {
      currentWeek.uploads += day.uploads;
      currentWeek.downloads += day.downloads;
      currentWeek.views += day.views;
      dayCount++;

      if (dayCount === 7) {
        weeks.push({ ...currentWeek });
        weekCount++;
        currentWeek = {
          week: `Tuần ${weekCount}`,
          uploads: 0,
          downloads: 0,
          views: 0,
        };
        dayCount = 0;
      }
    });

    if (dayCount > 0) {
      weeks.push({ ...currentWeek });
    }

    return weeks.slice(0, 4);
  }, [filteredDailyData]);

  const ratingValue = Number.isFinite(data.averageRating)
    ? data.averageRating
    : 0;
  const hasAnyRating = ratingValue > 0;
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
            <SelectTrigger className="w-44">
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
      {/* Header */}
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
            <Calendar className="mr-1 h-3 w-3" />
            {timeframeLabel}
          </Badge>
        </div>
        <Select
          value={timeRange}
          onValueChange={setTimeRange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-44">
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

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng tài liệu
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {formatNumber(data.totalDocuments)}
                </p>
              </div>
              <div className="bg-primary/10 rounded-full p-3">
                <FileText className="text-primary h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {monthlyGrowthValue >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${monthlyGrowthValue >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {monthlyGrowthValue >= 0 ? '+' : ''}
                {monthlyGrowthValue}%
              </span>
              <span className="text-muted-foreground text-sm">
                so với tháng trước
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng lượt tải
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {formatNumber(data.totalDownloads)}
                </p>
              </div>
              <div className="rounded-full bg-blue-500/10 p-3">
                <Download className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {downloadsGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${downloadsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {downloadsGrowth >= 0 ? '+' : ''}
                {downloadsGrowth}%
              </span>
              <span className="text-muted-foreground text-sm">
                so với kỳ trước
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng lượt xem
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {formatNumber(data.totalViews)}
                </p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3">
                <Eye className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {viewsGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${viewsGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {viewsGrowth >= 0 ? '+' : ''}
                {viewsGrowth}%
              </span>
              <span className="text-muted-foreground text-sm">
                so với kỳ trước
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Đánh giá trung bình
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {hasAnyRating ? (
                    <>
                      {ratingValue.toFixed(1)}
                      <span className="text-muted-foreground text-lg">/5</span>
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div className="rounded-full bg-yellow-500/10 p-3">
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <div className="mt-4">
              <Progress
                value={hasAnyRating ? ratingValue * 20 : 0}
                className="h-2"
              />
              {!hasAnyRating && (
                <p className="text-muted-foreground mt-2 text-xs">
                  Chưa có đánh giá nào được ghi nhận
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Trend Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Xu hướng hoạt động
          </CardTitle>
        </CardHeader>
        <CardContent>
          {combinedActivityData.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Chưa có dữ liệu hoạt động.
            </p>
          ) : (
            <ChartContainer
              config={activityChartConfig}
              className="h-[350px] w-full"
            >
              <AreaChart
                data={combinedActivityData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillUploads" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient
                    id="fillDownloads"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompactNumber}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="uploads"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#fillUploads)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="downloads"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#fillDownloads)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--chart-3))"
                  fill="url(#fillViews)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* User Statistics Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* User Overview Cards */}
        <div className="space-y-4">
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
                <div className="rounded-full bg-purple-500/10 p-3">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
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
                <Badge variant="secondary">
                  {activeUsersPercentage.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={activeUsersPercentage} className="mt-3 h-2" />
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
                <div className="flex items-center gap-1">
                  {data.userStats.userGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-medium ${data.userStats.userGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {data.userStats.userGrowth >= 0 ? '+' : ''}
                    {data.userStats.userGrowth}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Activity Gauge Charts */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Tỷ lệ người dùng hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Active Users Gauge */}
              <div className="text-center">
                <div className="relative inline-flex h-32 w-32">
                  <svg className="h-32 w-32 -rotate-90 transform">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="hsl(var(--muted))"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(activeUsersPercentage / 100) * 351.86} 351.86`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-chart-2 text-2xl font-bold">
                      {activeUsersPercentage.toFixed(0)}%
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Hoạt động
                    </span>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium">
                    {formatNumber(data.userStats.activeUsers)} /{' '}
                    {formatNumber(data.userStats.totalUsers)}
                  </p>
                  <Progress value={activeUsersPercentage} className="h-2" />
                </div>
              </div>

              {/* New Users Gauge */}
              <div className="text-center">
                <div className="relative inline-flex h-32 w-32">
                  <svg className="h-32 w-32 -rotate-90 transform">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="hsl(var(--muted))"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(Math.min(100, Math.max(0, 50 + data.userStats.userGrowth)) / 100) * 351.86} 351.86`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-chart-3 text-2xl font-bold">
                      {data.userStats.userGrowth >= 0 ? '+' : ''}
                      {data.userStats.userGrowth}%
                    </span>
                    <span className="text-muted-foreground text-xs">Mới</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium">
                    {formatNumber(data.userStats.newUsers)} người dùng mới
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    {data.userStats.userGrowth >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs ${data.userStats.userGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}
                    >
                      {data.userStats.userGrowth >= 0 ? 'Tăng' : 'Giảm'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Users Display */}
              <div className="text-center">
                <div className="relative inline-flex h-32 w-32 items-center justify-center rounded-full border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-purple-600/20">
                  <div className="text-center">
                    <Users className="mx-auto mb-1 h-8 w-8 text-purple-500" />
                    <p className="text-lg font-bold text-purple-600">
                      {formatNumber(data.userStats.totalUsers)}
                    </p>
                    <p className="text-muted-foreground text-xs">Tổng cộng</p>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium">Tổng người dùng</p>
                  <div className="text-muted-foreground flex justify-center gap-2 text-xs">
                    <span>
                      {formatNumber(data.userStats.activeUsers)} hoạt động
                    </span>
                    <span>•</span>
                    <span>{formatNumber(data.userStats.newUsers)} mới</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-muted-foreground mb-1 text-xs">
                  Tỷ lệ hoạt động
                </p>
                <p className="text-chart-2 text-lg font-bold">
                  {activeUsersPercentage.toFixed(1)}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {activeUsersPercentage >= 70
                    ? 'Tốt'
                    : activeUsersPercentage >= 50
                      ? 'Trung bình'
                      : 'Cần cải thiện'}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-muted-foreground mb-1 text-xs">
                  Tăng trưởng
                </p>
                <p className="text-chart-3 text-lg font-bold">
                  {data.userStats.userGrowth >= 0 ? '+' : ''}
                  {data.userStats.userGrowth}%
                </p>
                <p className="text-muted-foreground text-xs">
                  {data.userStats.userGrowth >= 10
                    ? 'Xuất sắc'
                    : data.userStats.userGrowth >= 0
                      ? 'Tăng trưởng'
                      : 'Giảm sút'}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-muted-foreground mb-1 text-xs">Độ lớn</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatNumber(data.userStats.totalUsers)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {data.userStats.totalUsers >= 1000
                    ? 'Lớn'
                    : data.userStats.totalUsers >= 100
                      ? 'Vừa'
                      : 'Nhỏ'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview - Radar & Radial Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Performance Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Tổng quan hiệu suất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="mx-auto h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  data={performanceRadarData}
                >
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 10 }}
                  />
                  <Radar
                    name="Hiệu suất"
                    dataKey="value"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                  <ChartTooltip
                    content={({ payload }) => {
                      if (payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background rounded-lg border p-2 shadow-md">
                            <p className="font-medium">{data.metric}</p>
                            <p className="text-muted-foreground text-sm">
                              {data.value.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Platform Health Radial Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Sức khỏe nền tảng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="mx-auto h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="20%"
                  outerRadius="90%"
                  barSize={18}
                  data={platformHealthData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                    label={{
                      position: 'insideStart',
                      fill: 'currentColor',
                      fontSize: 10,
                    }}
                  />
                  <ChartTooltip
                    content={({ payload }) => {
                      if (payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background rounded-lg border p-2 shadow-md">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-muted-foreground text-sm">
                              {data.value.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {platformHealthData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span>{item.name}:</span>
                  <span className="font-medium">{item.value.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Comparison */}
      {weeklyComparisonData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              So sánh theo tuần
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={activityChartConfig}
              className="h-[300px] w-full"
            >
              <BarChart
                data={weeklyComparisonData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompactNumber}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="uploads"
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="downloads"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="views"
                  fill="hsl(var(--chart-3))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Categories & Languages Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Categories Sunburst Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Phân bổ danh mục
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryPieData.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Chưa có dữ liệu danh mục.
              </p>
            ) : (
              <>
                <ChartContainer config={{}} className="mx-auto h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        label={({ name, percent }) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {categoryPieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fill}
                            stroke="white"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Pie
                        data={[
                          {
                            name: 'Total',
                            value: categoryPieData.reduce(
                              (sum, cat) => sum + cat.value,
                              0,
                            ),
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={35}
                        dataKey="value"
                        fill="hsl(var(--muted))"
                        stroke="white"
                        strokeWidth={2}
                      />
                      <ChartTooltip
                        content={({ payload }) => {
                          if (payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background/95 rounded-lg border p-3 shadow-lg backdrop-blur-sm">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-muted-foreground text-sm">
                                  {data.value} tài liệu
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {(
                                    (data.value /
                                      categoryPieData.reduce(
                                        (sum, cat) => sum + cat.value,
                                        0,
                                      )) *
                                    100
                                  ).toFixed(1)}
                                  % tổng
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="mb-2 text-center text-sm font-medium">
                      Top danh mục
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryPieData.slice(0, 4).map((cat, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-xs"
                        >
                          <div
                            className="h-3 w-3 rounded-full border border-white/50"
                            style={{ backgroundColor: cat.fill }}
                          />
                          <span className="truncate font-medium">
                            {cat.name}
                          </span>
                          <span className="text-muted-foreground ml-auto">
                            {(
                              (cat.value /
                                categoryPieData.reduce(
                                  (sum, c) => sum + c.value,
                                  0,
                                )) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Languages Treemap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              Phân bổ ngôn ngữ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {languageBarData.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Chưa có dữ liệu ngôn ngữ.
              </p>
            ) : (
              <>
                <div className="relative h-[300px]">
                  <div className="grid h-full grid-cols-3 gap-2">
                    {languageBarData.slice(0, 9).map((lang, index) => {
                      const maxValue = Math.max(
                        ...languageBarData.map(l => l.count),
                      );
                      const opacity = Math.max(
                        0.3,
                        Math.min(1, lang.count / maxValue),
                      );

                      return (
                        <div
                          key={index}
                          className="relative cursor-pointer overflow-hidden rounded-lg border-2 border-white/20 shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                          style={{
                            backgroundColor: lang.fill,
                            opacity,
                            gridColumn:
                              index < 2
                                ? 'span 2'
                                : index === 2
                                  ? 'span 1'
                                  : 'span 1',
                            gridRow: index === 0 ? 'span 2' : 'span 1',
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                          <div className="relative flex h-full flex-col justify-between p-3">
                            <div>
                              <p className="text-sm font-bold text-white drop-shadow-md">
                                {lang.name}
                              </p>
                              <p className="text-xs font-medium text-white/90 drop-shadow-md">
                                {lang.count} tài liệu
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-white drop-shadow-md">
                                {lang.percentage}%
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="mb-2 text-center text-sm font-medium">
                      Thống kê ngôn ngữ
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {languageBarData.slice(0, 4).map((lang, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-xs"
                        >
                          <div
                            className="h-3 w-3 rounded-full border border-white/50"
                            style={{ backgroundColor: lang.fill }}
                          />
                          <span className="truncate font-medium">
                            {lang.name}
                          </span>
                          <span className="text-muted-foreground ml-auto">
                            {lang.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-border/50 mt-2 border-t pt-2">
                      <p className="text-muted-foreground text-center text-xs">
                        Tổng: {languageBarData.length} ngôn ngữ •{' '}
                        {languageBarData.reduce((sum, l) => sum + l.count, 0)}{' '}
                        tài liệu
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng hàng tháng</CardTitle>
        </CardHeader>
        <CardContent>
          {data.monthlyStats.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Chưa có dữ liệu xu hướng hàng tháng.
            </p>
          ) : (
            <ChartContainer
              config={monthlyChartConfig}
              className="h-[350px] w-full"
            >
              <AreaChart
                data={data.monthlyStats}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="fillDownloads"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient
                    id="fillDocuments"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCompactNumber}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="downloads"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#fillDownloads)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#fillViews)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="documents"
                  stroke="hsl(var(--chart-3))"
                  fill="url(#fillDocuments)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Documents Comparison - Triangular Radar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            So sánh tài liệu hàng đầu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topDocsComparisonData.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Chưa có dữ liệu so sánh tài liệu.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {topDocsComparisonData.slice(0, 4).map((doc, index) => {
                const maxDownloads = Math.max(
                  ...topDocsComparisonData.map(d => d.downloads),
                  1,
                );
                const maxViews = Math.max(
                  ...topDocsComparisonData.map(d => d.views),
                  1,
                );
                const hasRating = doc.hasRating;
                const ratingValue = hasRating ? doc.rating : 0;

                const radarData = [
                  {
                    metric: 'Tải xuống',
                    value: (doc.downloads / maxDownloads) * 100,
                    fullMark: 100,
                  },
                  {
                    metric: 'Lượt xem',
                    value: (doc.views / maxViews) * 100,
                    fullMark: 100,
                  },
                  {
                    metric: 'Đánh giá',
                    value: hasRating ? (ratingValue / 5) * 100 : 0,
                    fullMark: 100,
                  },
                ];

                return (
                  <div key={index} className="relative">
                    <div className="absolute top-2 left-2 z-10">
                      <Badge
                        variant="outline"
                        className="bg-background/80 backdrop-blur-sm"
                      >
                        #{index + 1}
                      </Badge>
                    </div>
                    <ChartContainer
                      config={{
                        performance: {
                          label: 'Hiệu suất',
                          color: `hsl(var(--chart-${(index % 3) + 1}))`,
                        },
                      }}
                      className="h-[200px] w-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="70%"
                          data={radarData}
                          startAngle={90}
                          endAngle={-270}
                        >
                          <PolarGrid
                            gridType="polygon"
                            radialLines={true}
                            className="stroke-muted/30"
                          />
                          <PolarAngleAxis
                            dataKey="metric"
                            tick={{ fontSize: 11, fill: 'currentColor' }}
                            className="text-xs font-medium"
                          />
                          <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            axisLine={false}
                            tick={false}
                          />
                          <Radar
                            name="Hiệu suất"
                            dataKey="value"
                            stroke={`hsl(var(--chart-${(index % 3) + 1}))`}
                            fill={`hsl(var(--chart-${(index % 3) + 1}))`}
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                          <ChartTooltip
                            content={() => {
                              return (
                                <div className="bg-background/95 rounded-lg border p-2 shadow-lg backdrop-blur-sm">
                                  <p className="mb-1 text-xs font-medium">
                                    {doc.name}
                                  </p>
                                  {radarData.map((item, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between gap-4 text-xs"
                                    >
                                      <span className="text-muted-foreground">
                                        {item.metric}:
                                      </span>
                                      <span className="font-medium">
                                        {item.metric === 'Đánh giá'
                                          ? hasRating
                                            ? `${ratingValue.toFixed(1)}/5`
                                            : 'Chưa có đánh giá'
                                          : `${Math.round(item.value)}%`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <div className="mt-2 text-center">
                      <p
                        className="truncate text-xs font-medium"
                        title={doc.name}
                      >
                        {doc.name}
                      </p>
                      <div className="mt-1 flex justify-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {formatCompactNumber(doc.downloads)} tải
                        </span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-muted-foreground text-xs">
                          {formatCompactNumber(doc.views)} xem
                        </span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-muted-foreground text-xs">
                          ⭐ {hasRating ? ratingValue.toFixed(1) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Downloads & Views Tabs */}
      <Tabs defaultValue="downloads" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="downloads" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Top tải xuống
          </TabsTrigger>
          <TabsTrigger value="views" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Top lượt xem
          </TabsTrigger>
        </TabsList>

        <TabsContent value="downloads">
          <Card>
            <CardContent className="pt-6">
              {!topDownloads || topDownloads.documents.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Chưa có dữ liệu top tải xuống.
                </p>
              ) : (
                <div className="space-y-4">
                  {topDownloads.documents.map(doc => (
                    <div
                      key={doc.id}
                      className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full font-bold">
                          #{doc.rank}
                        </div>
                        <div>
                          <Link
                            to={`/documents/${doc.id}`}
                            className="hover:text-primary font-medium transition-colors"
                          >
                            {doc.title}
                          </Link>
                          {doc.category && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {doc.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-lg font-bold">
                            {formatNumber(doc.count)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Tải xuống
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-500">
                            {formatNumber(doc.views)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Lượt xem
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="flex items-center gap-1 text-lg font-bold text-yellow-500">
                            <Star className="h-4 w-4" />
                            {doc.averageRating > 0
                              ? doc.averageRating.toFixed(1)
                              : '—'}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Đánh giá
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="views">
          <Card>
            <CardContent className="pt-6">
              {!topViews || topViews.documents.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  Chưa có dữ liệu top lượt xem.
                </p>
              ) : (
                <div className="space-y-4">
                  {topViews.documents.map(doc => (
                    <div
                      key={doc.id}
                      className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 font-bold text-blue-500">
                          #{doc.rank}
                        </div>
                        <div>
                          <Link
                            to={`/documents/${doc.id}`}
                            className="hover:text-primary font-medium transition-colors"
                          >
                            {doc.title}
                          </Link>
                          {doc.category && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {doc.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-500">
                            {formatNumber(doc.count)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Lượt xem
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">
                            {formatNumber(doc.downloads)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Tải xuống
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="flex items-center gap-1 text-lg font-bold text-yellow-500">
                            <Star className="h-4 w-4" />
                            {doc.averageRating > 0
                              ? doc.averageRating.toFixed(1)
                              : '—'}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Đánh giá
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Top Documents Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Tài liệu hoạt động hàng đầu</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topDocuments.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Chưa có dữ liệu hiệu suất tài liệu.
            </p>
          ) : (
            <div className="space-y-4">
              {data.topDocuments.map((document, index) => (
                <div
                  key={document.id}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                        index === 0
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : index === 1
                            ? 'bg-gray-400/10 text-gray-400'
                            : index === 2
                              ? 'bg-amber-600/10 text-amber-600'
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
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
                        <Badge variant="secondary" className="text-xs">
                          {getLanguageName(document.language)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        <span className="font-medium">
                          {formatNumber(document.downloads)}
                        </span>
                      </div>
                      <p className="text-xs">Tải xuống</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span className="font-medium">
                          {formatNumber(document.views)}
                        </span>
                      </div>
                      <p className="text-xs">Lượt xem</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">
                          {document.rating > 0
                            ? document.rating.toFixed(1)
                            : '—'}
                        </span>
                      </div>
                      <p className="text-xs">Đánh giá</p>
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
