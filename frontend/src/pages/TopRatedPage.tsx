import { Award, Calendar, Download, Eye, Medal, Star, Trophy } from 'lucide-react';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  type TopRatedAnalyticsData,
  type TopRatedDocument,
  getTopRatedAnalytics,
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
  { value: '5', label: '5+ đánh giá' },
  { value: '10', label: '10+ đánh giá' },
  { value: '25', label: '25+ đánh giá' },
  { value: '50', label: '50+ đánh giá' },
];

const formatNumber = (value?: number | null) => {
  const numberValue = typeof value === 'number' ? value : 0;
  if (numberValue >= 1_000_000) return `${(numberValue / 1_000_000).toFixed(1)}M`;
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
      return <Award className="h-5 w-5 text-muted-foreground" />;
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
      className={`h-4 w-4 ${index < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
    />
  ));

const DEFAULT_DATA: TopRatedAnalyticsData = {
  timeframe: {
    range: '30d',
    startDate: new Date(0).toISOString(),
    endDate: new Date(0).toISOString(),
  },
  filters: {
    minRatings: 10,
  },
  stats: {
    totalDocuments: 0,
    averageRating: 0,
    totalRatings: 0,
    perfectCount: 0,
  },
  documents: [],
};

export default function TopRatedPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [minRatings, setMinRatings] = useState('10');
  const [data, setData] = useState<TopRatedAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTopRated = useCallback(async (rangeValue: string, minRatingsValue: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const minRatingsNumber = Number(minRatingsValue) || 10;
      const response = await getTopRatedAnalytics(rangeValue, minRatingsNumber);
      setData(response);
    } catch (err) {
      console.error('Failed to load top rated data', err);
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu top rated');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    [analytics.stats]
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Star className="h-8 w-8 text-primary" />
            Top Rated Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Các tài liệu được đánh giá cao nhất dựa trên đánh giá của người dùng
          </p>
          <Badge variant="outline" className="mt-2 text-xs font-normal">
            {formatDate(analytics.timeframe.startDate)} → {formatDate(analytics.timeframe.endDate)}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange} disabled={isLoading}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Chọn khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={minRatings} onValueChange={setMinRatings} disabled={isLoading}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Số đánh giá tối thiểu" />
            </SelectTrigger>
            <SelectContent>
              {MIN_RATING_OPTIONS.map((option) => (
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Đánh giá trung bình</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : stats.averageRating.toFixed(1)}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">Trên tất cả tài liệu hàng đầu</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng đánh giá</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : formatNumber(stats.totalRatings)}
                </p>
              </div>
              <Award className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">Đánh giá của người dùng</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Điểm tuyệt đối</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : stats.perfectCount}
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">Tài liệu có đánh giá 4.8+</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Rated Documents */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-3">
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
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-lg font-medium text-muted-foreground">
              No top rated documents found for this timeframe.
            </p>
            <p className="text-sm text-muted-foreground">
              Thử chọn khoảng thời gian khác hoặc giảm yêu cầu đánh giá tối thiểu.
            </p>
            <Button asChild>
              <Link to="/documents">Duyệt tài liệu</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
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
  const uploaderName = [document.uploader?.firstName, document.uploader?.lastName]
    .filter(Boolean)
    .join(' ');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <div className="flex items-center gap-2">
                {getRankIcon(document.rank)}
                <span className="text-2xl font-bold text-primary w-8">#{document.rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/documents/${document.id}`}
                    className="text-lg font-semibold hover:text-primary transition-colors"
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
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    {getRatingStars(document.averageRating)}
                  </div>
                  <span className="text-sm font-medium">{document.averageRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({formatNumber(document.ratingCount)} đánh giá)
                  </span>
                </div>
              </div>
            </div>

            {document.description && (
              <p className="text-sm text-muted-foreground mb-3 ml-11 line-clamp-2">
                {document.description}
              </p>
            )}

            <div className="flex items-center gap-4 mb-3 ml-11">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {(document.uploader?.firstName || 'U')[0]}
                    {(document.uploader?.lastName || 'U')[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {uploaderName || 'Tác giả không xác định'}
                </span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

            <div className="flex items-center gap-2 mb-3 ml-11">
              <Badge variant="secondary" className="text-xs">
                <span className="mr-1">{categoryIcon}</span>
                {categoryName}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getLanguageName(document.language)}
              </Badge>
              {tags.slice(0, 3).map((tag) => (
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

            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-11">
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
