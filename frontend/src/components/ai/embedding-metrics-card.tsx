import { useState } from 'react';

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  EmbeddingService,
  type CombinedMetrics,
} from '@/services/embedding.service';

/**
 * Component to display AI embedding and search performance metrics
 */
export function EmbeddingMetricsCard() {
  const [metrics, setMetrics] = useState<CombinedMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await EmbeddingService.getMetrics();
      setMetrics(data);
    } catch (error) {
      toast.error('Không thể tải metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCaches = async () => {
    setClearing(true);
    try {
      await EmbeddingService.clearCaches();
      toast.success('Đã xóa tất cả cache');
      // Reload metrics after clearing
      await loadMetrics();
    } catch (error) {
      toast.error('Không thể xóa cache');
    } finally {
      setClearing(false);
    }
  };

  const formatted = metrics
    ? EmbeddingService.formatMetricsForDisplay(metrics)
    : null;

  const performance = metrics
    ? EmbeddingService.isPerformanceGood(metrics)
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vector Search Performance
            </CardTitle>
            <CardDescription>
              Hiệu suất embedding generation và tìm kiếm
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMetrics}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCaches}
              disabled={clearing || !metrics}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {clearing ? 'Đang xóa...' : 'Xóa Cache'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!metrics && !loading && (
          <Alert>
            <AlertDescription>
              Nhấn "Làm mới" để xem performance metrics
            </AlertDescription>
          </Alert>
        )}

        {formatted && performance && (
          <div className="space-y-6">
            {/* Embedding Metrics */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Database className="h-4 w-4" />
                  Embedding Generation
                </h3>
                {performance.embedding ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Tốt
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Cần cải thiện
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricItem
                  label="Tổng số yêu cầu"
                  value={formatted.embedding.totalRequests}
                  icon={<Activity className="h-4 w-4" />}
                />
                <MetricItem
                  label="Tỷ lệ thành công"
                  value={formatted.embedding.successRate}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
                <MetricItem
                  label="Độ trễ TB"
                  value={formatted.embedding.averageLatency}
                  icon={<Zap className="h-4 w-4" />}
                />
                <MetricItem
                  label="Cache Hit Rate"
                  value={formatted.embedding.cacheHitRate}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Search Metrics */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Activity className="h-4 w-4" />
                  Vector Search
                </h3>
                {performance.search ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Tốt
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Cần cải thiện
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricItem
                  label="Tổng số tìm kiếm"
                  value={formatted.search.totalSearches}
                  icon={<Activity className="h-4 w-4" />}
                />
                <MetricItem
                  label="Vector Search Rate"
                  value={formatted.search.vectorSearchRate}
                  icon={<Database className="h-4 w-4" />}
                />
                <MetricItem
                  label="Độ trễ TB"
                  value={formatted.search.averageLatency}
                  icon={<Zap className="h-4 w-4" />}
                />
                <MetricItem
                  label="Cache Hit Rate"
                  value={formatted.search.cacheHitRate}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Performance Tips */}
            {(!performance.embedding || !performance.search) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">Gợi ý cải thiện hiệu suất:</p>
                    {!performance.embedding && (
                      <ul className="list-inside list-disc text-sm">
                        <li>
                          Embedding generation chậm - kiểm tra kết nối Google AI
                          API
                        </li>
                        <li>Cache hit rate thấp - xem xét tăng cache size</li>
                      </ul>
                    )}
                    {!performance.search && (
                      <ul className="list-inside list-disc text-sm">
                        <li>
                          Search chậm - đảm bảo HNSW index đã được tạo trong
                          database
                        </li>
                        <li>
                          Cache hit rate thấp - người dùng thường tìm kiếm
                          queries khác nhau
                        </li>
                      </ul>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Metric item component
 */
function MetricItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
