import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Award,
  Calendar,
  Download,
  Eye,
  Medal,
  Star,
  Trophy,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/loading-skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getTopRatedAnalytics,
  type TopRatedAnalyticsData,
  type TopRatedDocument,
} from '@/services/analytics.service';
import { formatDate } from '@/utils/date';
import { getLanguageName } from '@/utils/language';

const RANGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '7d', label: '7 ngày qua' },
  { value: '30d', label: '30 ngày qua' },
  { value: '90d', label: '90 ngày qua' },
  { value: '1y', label: 'Năm qua' },
];

const MIN_RATING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '1', label: 'Từ 1 đánh giá' },
  { value: '3', label: '3+ đánh giá' },
  { value: '5', label: '5+ đánh giá' },
  { value: '10', label: '10+ đánh giá' },
  { value: '25', label: '25+ đánh giá' },
];

const formatNumber = (value?: number | null) => {
  const numberValue = typeof value === 'number' ? value : 0;
  if (numberValue >= 1_000_000)
    return `${(numberValue / 1_000_000).toFixed(1)}M`;
  if (numberValue >= 1_000) return `${(numberValue / 1_000).toFixed(1)}K`;
  return numberValue.toString();
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return <Award className="text-muted-foreground h-5 w-5" />;
  }
};

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return <Badge className="bg-yellow-500 text-white">🥇 #1</Badge>;
    case 2:
      return <Badge className="bg-gray-400 text-white">🥈 #2</Badge>;
    case 3:
      return <Badge className="bg-amber-600 text-white">🥉 #3</Badge>;
    default:
      return <Badge variant="outline">#{rank}</Badge>;
  }
};

const getRatingStars = (rating: number) =>
  Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      className={`h-4 w-4 ${index < Math.floor(rating) ? 'fill-current text-yellow-400' : 'text-gray-300'}`}
    />
  ));

const DEFAULT_DATA: TopRatedAnalyticsData = {
  timeframe: {
    range: '30d',
    startDate: new Date(0).toISOString(),
    endDate: new Date(0).toISOString(),
  },
  filters: {
    minRatings: 3,
  },
  stats: {
    totalDocuments: 0,
    averageRating: 0,
    totalRatings: 0,
    perfectCount: 0,
  },
  meta: {
    appliedRange: '30d',
    usedFallback: false,
    appliedMinRatings: 3,
  },
  documents: [],
};

export default function TopRatedPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial values from URL
  const [timeRange, setTimeRange] = useState(
    () => searchParams.get('range') || '30d',
  );
  const [minRatings, setMinRatings] = useState(
    () => searchParams.get('minRatings') || '3',
  );
  const [data, setData] = useState<TopRatedAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update URL when filters change
  const updateUrlParams = useCallback(
    (range: string, ratings: string) => {
      const newParams = new URLSearchParams();
      if (range !== '30d') newParams.set('range', range);
      if (ratings !== '3') newParams.set('minRatings', ratings);
      setSearchParams(newParams);
    },
    [setSearchParams],
  );

  const handleTimeRangeChange = useCallback(
    (value: string) => {
      setTimeRange(value);
      updateUrlParams(value, minRatings);
    },
    [minRatings, updateUrlParams],
  );

  const handleMinRatingsChange = useCallback(
    (value: string) => {
      setMinRatings(value);
      updateUrlParams(timeRange, value);
    },
    [timeRange, updateUrlParams],
  );

  const loadTopRated = useCallback(
    async (rangeValue: string, minRatingsValue: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const minRatingsNumber = Number(minRatingsValue) || 3;
        const response = await getTopRatedAnalytics(
          rangeValue,
          minRatingsNumber,
        );
        setData(response);
      } catch (err) {
        console.error('Failed to load top rated data', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải dữ liệu top rated',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Sync state from URL on mount and URL changes
  useEffect(() => {
    const range = searchParams.get('range') || '30d';
    const ratings = searchParams.get('minRatings') || '3';
    setTimeRange(range);
    setMinRatings(ratings);
  }, [searchParams]);

  useEffect(() => {
    void loadTopRated(timeRange, minRatings);
  }, [timeRange, minRatings, loadTopRated]);

  const analytics = data ?? DEFAULT_DATA;
  const documents = analytics.documents;

  const stats = useMemo(
    () => ({
      averageRating: analytics.stats.averageRating,
      totalRatings: analytics.stats.totalRatings,
      perfectCount: analytics.stats.perfectCount,
    }),
    [analytics.stats],
  );
  const appliedRange = analytics.meta?.appliedRange ?? analytics.timeframe.range;
  const usedFallback = analytics.meta?.usedFallback ?? false;
  const appliedMinRatings =
    analytics.meta?.appliedMinRatings ?? analytics.filters.minRatings;
  const timeframeLabel =
    appliedRange === 'all-time'
      ? 'Tất cả thời gian'
      : `${formatDate(analytics.timeframe.startDate)} → ${formatDate(analytics.timeframe.endDate)}`;
  const averageRatingLabel =
    stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—';

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Star className="text-primary h-8 w-8" />
              Tài liệu được đánh giá cao nhất
            </h1>
            <p className="text-muted-foreground mt-1">
              Các tài liệu được đánh giá cao nhất dựa trên đánh giá của người
              dùng
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              value={timeRange}
              onValueChange={handleTimeRangeChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Chọn khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                {RANGE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={minRatings}
              onValueChange={handleMinRatingsChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Số đánh giá tối thiểu" />
              </SelectTrigger>
              <SelectContent>
                {MIN_RATING_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <LoadingPage
          title=""
          description=""
          showStats={true}
          showTable={true}
          showList={false}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Star className="text-primary h-8 w-8" />
            Top Rated Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Các tài liệu được đánh giá cao nhất dựa trên đánh giá của người dùng
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs font-normal">
              {timeframeLabel}
            </Badge>
            <Badge variant="secondary" className="text-xs font-normal">
              Tối thiểu {appliedMinRatings}+ đánh giá
            </Badge>
            {usedFallback && (
              <Badge variant="outline" className="text-xs font-normal">
                Đã nới lỏng bộ lọc để có kết quả
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={timeRange}
            onValueChange={handleTimeRangeChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Chọn khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={minRatings}
            onValueChange={handleMinRatingsChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Số đánh giá tối thiểu" />
            </SelectTrigger>
            <SelectContent>
              {MIN_RATING_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Không thể tải dữ liệu top rated</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Top Rated Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Đánh giá trung bình
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    averageRatingLabel
                  )}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Trên tất cả tài liệu hàng đầu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng đánh giá
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    formatNumber(stats.totalRatings)
                  )}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Đánh giá của người dùng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Điểm tuyệt đối
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-6 w-12" />
                  ) : (
                    stats.perfectCount
                  )}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Tài liệu có đánh giá 4.8+
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Rated Documents */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <p className="text-muted-foreground text-lg font-medium">
              Không tìm thấy tài liệu được đánh giá cao trong khoảng thời gian
              này.
            </p>
            <p className="text-muted-foreground text-sm">
              Thử chọn khoảng thời gian khác hoặc giảm yêu cầu đánh giá tối
              thiểu.
            </p>
            <Button asChild>
              <Link to="/documents">Duyệt tài liệu</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map(document => (
            <TopRatedDocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TopRatedDocumentCardProps {
  document: TopRatedDocument;
}

function TopRatedDocumentCard({ document }: TopRatedDocumentCardProps) {
  const categoryIcon = document.category?.icon ?? '📄';
  const categoryName = document.category?.name ?? 'Uncategorized';
  const tags = document.tags ?? [];
  const createdAt = formatDate(document.createdAt);
  const uploaderName = [
    document.uploader?.firstName,
    document.uploader?.lastName,
  ]
    .filter(Boolean)
    .join(' ');
  const hasRatings = (document.ratingCount ?? 0) > 0;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-start gap-3">
              <div className="flex items-center gap-2">
                {getRankIcon(document.rank)}
                <span className="text-primary w-8 text-2xl font-bold">
                  #{document.rank}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/documents/${document.id}`}
                    className="hover:text-primary text-lg font-semibold transition-colors"
                  >
                    {document.title}
                  </Link>
                  {getRankBadge(document.rank)}
                  {document.isPremium && (
                    <Badge variant="default" className="text-xs">
                      Premium
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {hasRatings ? (
                    <>
                      <div className="flex items-center gap-1">
                        {getRatingStars(document.averageRating)}
                      </div>
                      <span className="text-sm font-medium">
                        {document.averageRating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        ({formatNumber(document.ratingCount)} đánh giá)
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Chưa có đánh giá
                    </span>
                  )}
                </div>
              </div>
            </div>

            {document.description && (
              <p className="text-muted-foreground mb-3 ml-11 line-clamp-2 text-sm">
                {document.description}
              </p>
            )}

            <div className="mb-3 ml-11 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {(document.uploader?.firstName || 'U')[0]}
                    {(document.uploader?.lastName || 'U')[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground text-sm">
                  {uploaderName || 'Tác giả không xác định'}
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="text-muted-foreground flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{formatNumber(document.downloadCount)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{formatNumber(document.viewCount)}</span>
                </div>
              </div>
            </div>

            <div className="mb-3 ml-11 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1">{categoryIcon}</span>
                {categoryName}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getLanguageName(document.language)}
              </Badge>
              {tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3} thêm
                </Badge>
              )}
            </div>

            <div className="text-muted-foreground ml-11 flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              <span>Tạo {createdAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/documents/${document.id}`}>Xem tài liệu</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
