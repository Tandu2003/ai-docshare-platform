import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Calendar,
  Clock,
  Download,
  Eye,
  Flame,
  Star,
  TrendingDown,
  TrendingUp,
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
  getTrendingAnalytics,
  type TrendingAnalyticsData,
  type TrendingDocument,
} from '@/services/analytics.service';
import { formatDate } from '@/utils/date';
import { getDocumentStatusInfo, getStatusIcon } from '@/utils/document-status';
import { getLanguageName } from '@/utils/language';

const RANGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '7d', label: '7 ngày qua' },
  { value: '30d', label: '30 ngày qua' },
  { value: '90d', label: '90 ngày qua' },
  { value: '1y', label: 'Năm qua' },
];

const formatNumber = (value?: number | null) => {
  const numberValue = typeof value === 'number' ? value : 0;
  if (numberValue >= 1_000_000)
    return `${(numberValue / 1_000_000).toFixed(1)}M`;
  if (numberValue >= 1_000) return `${(numberValue / 1_000).toFixed(1)}K`;
  return numberValue.toString();
};

const getTrendingBadge = (score: number) => {
  if (score >= 90)
    return <Badge className="bg-red-500 text-white">🔥 Hot</Badge>;
  if (score >= 80)
    return <Badge className="bg-orange-500 text-white">📈 Đang tăng</Badge>;
  if (score >= 70)
    return (
      <Badge className="bg-yellow-500 text-white">⭐ Đang thịnh hành</Badge>
    );
  return <Badge variant="outline">📊 Phổ biến</Badge>;
};

const getTrendingIcon = (change: number) => {
  if (change > 20) return <Flame className="h-4 w-4 text-red-500" />;
  if (change > 5) return <TrendingUp className="h-4 w-4 text-orange-500" />;
  if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (change < 0) return <TrendingDown className="h-4 w-4 text-gray-500" />;
  return <TrendingUp className="text-muted-foreground h-4 w-4" />;
};

const formatChangeLabel = (change: number) => {
  if (change > 0) return `+${change.toFixed(1)}%`;
  if (change < 0) return `${change.toFixed(1)}%`;
  return '0%';
};

const getInitials = (firstName?: string | null, lastName?: string | null) =>
  `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`
    .trim()
    .toUpperCase() || 'U';

export default function TrendingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial values from URL
  const [timeRange, setTimeRange] = useState(
    () => searchParams.get('range') || '7d',
  );
  const [data, setData] = useState<TrendingAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync URL when timeRange changes
  const handleTimeRangeChange = useCallback(
    (value: string) => {
      setTimeRange(value);
      const newParams = new URLSearchParams(searchParams);
      if (value === '7d') {
        newParams.delete('range');
      } else {
        newParams.set('range', value);
      }
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams],
  );

  const fetchTrending = useCallback(async (rangeValue: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTrendingAnalytics(rangeValue);
      setData(response);
    } catch (err) {
      console.error('Failed to load trending data', err);
      setError(
        err instanceof Error ? err.message : 'Không thể tải dữ liệu trending',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync state from URL on mount and URL changes
  useEffect(() => {
    const range = searchParams.get('range') || '7d';
    setTimeRange(range);
  }, [searchParams]);

  useEffect(() => {
    void fetchTrending(timeRange);
  }, [timeRange, fetchTrending]);

  const trendingDocuments = data?.documents ?? [];

  const stats = useMemo(() => {
    if (!data) {
      return {
        totalTrending: 0,
        averageScore: 0,
        topGrowth: 0,
      };
    }

    return {
      totalTrending: data.stats.totalTrending,
      averageScore: Number(data.stats.averageScore || 0),
      topGrowth: Number(data.stats.topGrowth || 0),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <TrendingUp className="text-primary h-8 w-8" />
              Trending Documents
            </h1>
            <p className="text-muted-foreground mt-1">
              Khám phá những tài liệu phổ biến và phát triển nhanh nhất
            </p>
          </div>
          <Select
            value={timeRange}
            onValueChange={handleTimeRangeChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-40">
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
            <TrendingUp className="text-primary h-8 w-8" />
            Trending Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Khám phá những tài liệu phổ biến và phát triển nhanh nhất
          </p>
          {data && (
            <Badge variant="outline" className="mt-2 text-xs font-normal">
              {formatDate(data.timeframe.startDate)} →{' '}
              {formatDate(data.timeframe.endDate)}
            </Badge>
          )}
        </div>
        <Select
          value={timeRange}
          onValueChange={handleTimeRangeChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-40">
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
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Không thể tải dữ liệu trending</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Trending Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tổng đang thịnh hành
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    stats.totalTrending
                  )}
                </p>
              </div>
              <Flame className="text-muted-foreground h-8 w-8" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Điểm TB
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    stats.averageScore.toFixed(1)
                  )}
                </p>
              </div>
              <Star className="text-muted-foreground h-8 w-8" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Tăng trưởng hàng đầu
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    `${stats.topGrowth >= 0 ? '+' : ''}${stats.topGrowth}%`
                  )}
                </p>
              </div>
              <TrendingUp className="text-muted-foreground h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-6 w-64" />
                  </div>
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : trendingDocuments.length === 0 ? (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <p className="text-muted-foreground text-lg font-medium">
              Không tìm thấy tài liệu thịnh hành trong khoảng thời gian này.
            </p>
            <p className="text-muted-foreground text-sm">
              Thử chọn khoảng thời gian khác hoặc khuyến khích người dùng tương
              tác nhiều hơn.
            </p>
            <Button asChild>
              <Link to="/documents">Duyệt tài liệu</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trendingDocuments.map((document, index) => (
            <TrendingDocumentCard
              key={document.id}
              index={index}
              document={document}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TrendingDocumentCardProps {
  index: number;
  document: TrendingDocument;
}

function TrendingDocumentCard({ index, document }: TrendingDocumentCardProps) {
  const categoryIcon = document.category?.icon ?? '📄';
  const categoryName = document.category?.name ?? 'Uncategorized';
  const uploaderName = [
    document.uploader?.firstName,
    document.uploader?.lastName,
  ]
    .filter(Boolean)
    .join(' ');
  const tags = document.tags ?? [];
  const createdAt = formatDate(document.createdAt);
  const lastUpdated = formatDate(document.lastUpdated);
  const statusInfo = getDocumentStatusInfo(document.isApproved, undefined);

  return (
    <Card className="border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Badge variant="outline" className="px-3 py-1 text-lg">
                  #{index + 1}
                </Badge>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/documents/${document.id}`}
                      className="hover:text-primary text-lg font-semibold transition-colors"
                    >
                      {document.title}
                    </Link>
                    {getTrendingBadge(document.trendingScore)}
                    {document.isPremium && (
                      <Badge className="bg-yellow-500 text-white">
                        Premium
                      </Badge>
                    )}
                    {!document.isPublic && (
                      <Badge variant="secondary">Riêng tư</Badge>
                    )}

                    {/* Review Status Badge */}
                    <Badge
                      variant={statusInfo.variant}
                      className={`${statusInfo.className} text-xs`}
                    >
                      <span className="mr-1">{getStatusIcon(statusInfo)}</span>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  {document.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                      {document.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                {getTrendingIcon(document.trendingChange)}
                <span>{formatChangeLabel(document.trendingChange)}</span>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">{categoryIcon}</span>
                <span>{categoryName}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <Badge variant="outline">
                {getLanguageName(document.language)}
              </Badge>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(
                      document.uploader?.firstName,
                      document.uploader?.lastName,
                    )}
                  </AvatarFallback>
                </Avatar>
                <span>{uploaderName || 'Tác giả không xác định'}</span>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                <span>{formatNumber(document.downloadCount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{formatNumber(document.viewCount)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                <span>{document.averageRating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-red-500" />
                <span>Điểm {document.trendingScore.toFixed(1)}</span>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Tạo {createdAt}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Cập nhật {lastUpdated}</span>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 5).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {tags.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 5} thêm
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/documents/${document.id}`}>Xem tài liệu</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/documents/${document.id}#share`}>Chia sẻ</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
