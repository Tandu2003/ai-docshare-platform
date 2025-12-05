import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from 'react';

import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  DocumentPreview,
  PreviewStatus,
} from '@/services/document.service';
import { PreviewService } from '@/services/preview.service';

interface DocumentPreviewViewerProps {
  documentId: string;
  previews?: DocumentPreview[];
  previewStatus?: PreviewStatus;
  previewCount?: number;
  isOwner?: boolean;
  hasAccess?: boolean;
  apiKey?: string;
  className?: string;
  onPreviewClick?: (preview: DocumentPreview) => void;
}

export function DocumentPreviewViewer({
  documentId,
  previews: initialPreviews,
  previewStatus: initialStatus,
  isOwner = false,
  hasAccess = true,
  apiKey,
  className,
  onPreviewClick,
}: DocumentPreviewViewerProps): ReactElement {
  const [previews, setPreviews] = useState<DocumentPreview[]>(
    initialPreviews || [],
  );
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>(
    initialStatus || 'PENDING',
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imageLoadError, setImageLoadError] = useState<Set<number>>(new Set());

  // Update state when initial props change
  useEffect(() => {
    if (initialPreviews) {
      setPreviews(initialPreviews);
    }
    if (initialStatus) {
      setPreviewStatus(initialStatus);
    }
  }, [initialPreviews, initialStatus]);

  // Auto-refresh previews when URLs expire (every 25 seconds)
  const refreshPreviews = useCallback(async () => {
    if (!hasAccess || previewStatus !== 'COMPLETED') return;

    try {
      const result = await PreviewService.getDocumentPreviews(
        documentId,
        apiKey,
      );
      setPreviews(result.previews);
    } catch (err) {
      console.warn('Failed to refresh previews:', err);
    }
  }, [documentId, apiKey, hasAccess, previewStatus]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (previewStatus !== 'COMPLETED' || previews.length === 0) return;

    const intervalId = setInterval(refreshPreviews, 25000); // 25 seconds

    return () => clearInterval(intervalId);
  }, [refreshPreviews, previewStatus, previews.length]);

  // Poll for status when processing
  useEffect(() => {
    if (previewStatus !== 'PENDING' && previewStatus !== 'PROCESSING') return;

    const pollStatus = async () => {
      try {
        const status = await PreviewService.getPreviewStatus(documentId);
        setPreviewStatus(status.status);

        if (status.status === 'COMPLETED') {
          // Fetch the previews
          const result = await PreviewService.getDocumentPreviews(
            documentId,
            apiKey,
          );
          setPreviews(result.previews);
        }
      } catch (err) {
        console.warn('Failed to poll preview status:', err);
      }
    };

    const intervalId = setInterval(pollStatus, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [documentId, apiKey, previewStatus]);

  // Handle regenerate previews
  const handleRegenerate = async () => {
    if (!isOwner || isRegenerating) return;

    try {
      setIsRegenerating(true);
      setError(null);
      setPreviewStatus('PROCESSING');
      await PreviewService.regeneratePreviews(documentId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tạo lại preview',
      );
      setPreviewStatus('FAILED');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Current preview
  const currentPreview = useMemo(() => {
    return previews.find(p => p.pageNumber === currentPage);
  }, [previews, currentPage]);

  // Handle page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= previews.length) {
      setCurrentPage(page);
      setImageLoadError(prev => {
        const next = new Set(prev);
        next.delete(page);
        return next;
      });
    }
  };

  // Handle zoom
  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  // Handle image load error
  const handleImageError = (pageNumber: number) => {
    setImageLoadError(prev => new Set([...prev, pageNumber]));
  };

  // Render loading state
  if (previewStatus === 'PENDING' || previewStatus === 'PROCESSING') {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="flex min-h-[400px] flex-col items-center justify-center p-6">
          <Loader2 className="text-muted-foreground mb-4 h-12 w-12 animate-spin" />
          <p className="text-muted-foreground text-center">
            {previewStatus === 'PENDING'
              ? 'Đang chờ tạo preview...'
              : 'Đang tạo preview...'}
          </p>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Quá trình này có thể mất vài giây
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (previewStatus === 'FAILED' || error) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="flex min-h-[400px] flex-col items-center justify-center p-6">
          <FileText className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-center">
            {error || 'Không thể tạo preview cho tài liệu này'}
          </p>
          {isOwner && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Thử lại
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render no access state
  if (!hasAccess) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="flex min-h-[400px] flex-col items-center justify-center p-6">
          <Lock className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-center">
            Bạn không có quyền xem preview tài liệu này
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (previews.length === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="flex min-h-[400px] flex-col items-center justify-center p-6">
          <FileText className="text-muted-foreground mb-4 h-12 w-12" />
          <p className="text-muted-foreground text-center">
            Không có preview cho tài liệu này
          </p>
          <p className="text-muted-foreground mt-2 text-center text-sm">
            Định dạng file có thể không hỗ trợ preview
          </p>
          {isOwner && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Tạo preview
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        {/* Preview toolbar */}
        <div className="flex items-center justify-between border-b p-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Trang {currentPage} / {previews.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === previews.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetZoom}
              className="min-w-[60px]"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button variant="ghost" size="icon" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>

            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                title="Tạo lại preview"
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Preview image */}
        <div
          className="flex min-h-[500px] items-center justify-center overflow-auto bg-gray-100 p-4 dark:bg-gray-900"
          onClick={() => currentPreview && onPreviewClick?.(currentPreview)}
        >
          {currentPreview && !imageLoadError.has(currentPage) ? (
            <img
              src={currentPreview.previewUrl}
              alt={`Preview trang ${currentPage}`}
              className="max-w-full cursor-pointer transition-transform"
              style={{ transform: `scale(${zoom})` }}
              onError={() => handleImageError(currentPage)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <FileText className="text-muted-foreground mb-2 h-16 w-16" />
              <p className="text-muted-foreground text-sm">
                Không thể tải preview
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refreshPreviews()}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Tải lại
              </Button>
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {previews.length > 1 && (
          <div className="flex gap-2 overflow-x-auto border-t p-2">
            {previews.map(preview => (
              <button
                key={preview.id}
                className={cn(
                  'flex-shrink-0 overflow-hidden rounded border-2 transition-all',
                  currentPage === preview.pageNumber
                    ? 'border-primary'
                    : 'border-transparent hover:border-gray-300',
                )}
                onClick={() => goToPage(preview.pageNumber)}
              >
                <img
                  src={preview.previewUrl}
                  alt={`Thumbnail trang ${preview.pageNumber}`}
                  className="h-16 w-auto object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Security notice */}
        <div className="bg-muted/50 px-4 py-2 text-center text-xs text-gray-500">
          <Lock className="mr-1 inline-block h-3 w-3" />
          Preview được bảo vệ • URL tự động hết hạn sau 30 giây
        </div>
      </CardContent>
    </Card>
  );
}
