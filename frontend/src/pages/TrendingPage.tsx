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
  getTrendingAnalytics,
  type TrendingAnalyticsData,
  type TrendingDocument,
} from '@/services/analytics.service';
import { formatDate } from '@/utils/date';
import { getLanguageName } from '@/utils/language';

const RANGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
];

const formatNumber = (value?: number | null) => {
  const numberValue = typeof value === 'number' ? value : 0;
  if (numberValue >= 1_000_000) return `${(numberValue / 1_000_000).toFixed(1)}M`;
  if (numberValue >= 1_000) return `${(numberValue / 1_000).toFixed(1)}K`;
  return numberValue.toString();
};

const getTrendingBadge = (score: number) => {
  if (score >= 90) return <Badge className="bg-red-500 text-white">🔥 Hot</Badge>;
  if (score >= 80) return <Badge className="bg-orange-500 text-white">📈 Rising</Badge>;
  if (score >= 70) return <Badge className="bg-yellow-500 text-white">⭐ Trending</Badge>;
  return <Badge variant="outline">📊 Popular</Badge>;
};

const getTrendingIcon = (change: number) => {
  if (change > 20) return <Flame className="h-4 w-4 text-red-500" />;
  if (change > 5) return <TrendingUp className="h-4 w-4 text-orange-500" />;
  if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (change < 0) return <TrendingDown className="h-4 w-4 text-gray-500" />;
  return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
};

const formatChangeLabel = (change: number) => {
  if (change > 0) return `+${change.toFixed(1)}%`;
  if (change < 0) return `${change.toFixed(1)}%`;
  return '0%';
};

const getInitials = (firstName?: string | null, lastName?: string | null) =>
  `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`.trim().toUpperCase() || 'U';

export default function TrendingPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [data, setData] = useState<TrendingAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async (rangeValue: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTrendingAnalytics(rangeValue);
      setData(response);
    } catch (err) {
      console.error('Failed to load trending data', err);
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu trending');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Trending Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover the most popular and fast-growing documents
          </p>
          {data && (
            <Badge variant="outline" className="mt-2 text-xs font-normal">
              {formatDate(data.timeframe.startDate)} → {formatDate(data.timeframe.endDate)}
            </Badge>
          )}
        </div>
        <Select value={timeRange} onValueChange={setTimeRange} disabled={isLoading}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Trending</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-6 w-16" /> : stats.totalTrending}
                </p>
              </div>
              <Flame className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-6 w-16" /> : stats.averageScore.toFixed(1)}
                </p>
              </div>
              <Star className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Growth</p>
                <p className="text-2xl font-bold">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : `${stats.topGrowth >= 0 ? '+' : ''}${stats.topGrowth}%`}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
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
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-lg font-medium text-muted-foreground">
              No trending documents found for this timeframe.
            </p>
            <p className="text-sm text-muted-foreground">
              Try selecting a different time range or encourage users to engage with more content.
            </p>
            <Button asChild>
              <Link to="/documents">Browse Documents</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trendingDocuments.map((document, index) => (
            <TrendingDocumentCard key={document.id} index={index} document={document} />
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
  const uploaderName = [document.uploader?.firstName, document.uploader?.lastName]
    .filter(Boolean)
    .join(' ');
  const tags = document.tags ?? [];
  const createdAt = formatDate(document.createdAt);
  const lastUpdated = formatDate(document.lastUpdated);

  return (
    <Card className="border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  #{index + 1}
                </Badge>
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/documents/${document.id}`}
                      className="text-lg font-semibold hover:text-primary transition-colors"
                    >
                      {document.title}
                    </Link>
                    {getTrendingBadge(document.trendingScore)}
                    {document.isPremium && (
                      <Badge className="bg-yellow-500 text-white">Premium</Badge>
                    )}
                    {!document.isPublic && (
                      <Badge variant="secondary">Private</Badge>
                    )}
                  </div>
                  {document.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {document.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getTrendingIcon(document.trendingChange)}
                <span>{formatChangeLabel(document.trendingChange)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-xl">{categoryIcon}</span>
                <span>{categoryName}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <Badge variant="outline">{getLanguageName(document.language)}</Badge>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(document.uploader?.firstName, document.uploader?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <span>{uploaderName || 'Unknown author'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                <span>Score {document.trendingScore.toFixed(1)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Created {createdAt}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Updated {lastUpdated}</span>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 5).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {tags.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{tags.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/documents/${document.id}`}>View Document</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/documents/${document.id}#share`}>Share</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
