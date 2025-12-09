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
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type {
  DocumentPreview,
  PreviewStatus,
} from '@/services/document.service';
import { PreviewService } from '@/services/preview.service';

interface DocumentPreviewPanelProps {
  documentId: string;
  previews?: DocumentPreview[];
  previewStatus?: PreviewStatus;
  previewCount?: number;
  isOwner?: boolean;
  hasAccess?: boolean;
  apiKey?: string;
  className?: string;
  onRegenerateComplete?: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.25;
const AUTO_REFRESH_INTERVAL = 25000; // 25 seconds
const POLL_INTERVAL = 3000; // 3 seconds

export function DocumentPreviewPanel({
  documentId,
  previews: initialPreviews,
  previewStatus: initialStatus,
  isOwner = false,
  hasAccess = true,
  apiKey,
  className,
  onRegenerateComplete,
}: DocumentPreviewPanelProps): ReactElement {
  const [previews, setPreviews] = useState<DocumentPreview[]>(
    initialPreviews || [],
  );
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>(
    initialStatus || 'PENDING',
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imageLoadError, setImageLoadError] = useState<Set<number>>(new Set());
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Update state when initial props change
  useEffect(() => {
    if (initialPreviews) {
      setPreviews(initialPreviews);
    }
    if (initialStatus) {
      setPreviewStatus(initialStatus);
    }
  }, [initialPreviews, initialStatus]);

  // Sync page input with current page
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Auto-refreshhen URLs expire
  const refreshPreviews = useCallback(async () => {
    if (!hasAccess || previewStatus !== 'COMPLETED') return;

    try {
      const result = await PreviewService.getDocumentPreviews(
        documentId,
        apiKey,
      );
      setPreviews(result.previews);
    } catch {
      // Failed to refresh previews - silent fail
    }
  }, [documentId, apiKey, hasAccess, previewStatus]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (previewStatus !== 'COMPLETED' || previews.length === 0) return;

    const intervalId = setInterval(refreshPreviews, AUTO_REFRESH_INTERVAL);
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
          const result = await PreviewService.getDocumentPreviews(
            documentId,
            apiKey,
          );
          setPreviews(result.previews);
          onRegenerateComplete?.();
        }
      } catch {
        // Failed to poll preview status - silent fail
      }
    };

    const intervalId = setInterval(pollStatus, POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [documentId, apiKey, previewStatus, onRegenerateComplete]);

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

  // Total pages
  const totalPages = previews.length;

  // Handle page navigation
  const goToPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, Math.min(page, totalPages));
      if (validPage !== currentPage) {
        setCurrentPage(validPage);
        setImageLoadError(prev => {
          const next = new Set(prev);
          next.delete(validPage);
          return next;
        });
        setIsImageLoading(true);
      }
    },
    [totalPages, currentPage],
  );

  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  // Handle page input change
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  // Handle page input submit
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page)) {
      goToPage(page);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Handle page input blur
  const handlePageInputBlur = () => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page)) {
      goToPage(page);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Handle zoom - constrained between MIN_ZOOM and MAX_ZOOM
  const zoomIn = () => setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setZoom(z => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  const resetZoom = () => setZoom(1);

  // Handle image load error
  const handleImageError = (pageNumber: number) => {
    setImageLoadError(prev => new Set([...prev, pageNumber]));
    setIsImageLoading(false);
  };

  // Handle image load success
  const handleImageLoad = () => {
    setIsImageLoading(false);
  };

  // Render loading state
  if (previewStatus === 'PENDING' || previewStatus === 'PROCESSING') {
    return (
      <div
        className={cn(
          'bg-muted flex min-h-[500px] flex-col items-center justify-center rounded-lg',
          className,
        )}
        data-testid="preview-loading"
      >
        <Loader2 className="text-muted-foreground mb-4 h-12 w-12 animate-spin" />
        <p className="text-muted-foreground text-center">
          {previewStatus === 'PENDING'
            ? 'Đang chờ tạo preview...'
            : 'Đang tạo preview...'}
        </p>
        <p className="text-muted-foreground mt-2 text-center text-sm">
          Quá trình này có thể mất vài giây
        </p>
      </div>
    );
  }

  // Render error state
  if (previewStatus === 'FAILED' || error) {
    return (
      <div
        className={cn(
          'bg-muted flex min-h-[500px] flex-col items-center justify-center rounded-lg',
          className,
        )}
        data-testid="preview-error"
      >
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
      </div>
    );
  }

  // Render no access state
  if (!hasAccess) {
    return (
      <div
        className={cn(
          'bg-muted flex min-h-[500px] flex-col items-center justify-center rounded-lg',
          className,
        )}
        data-testid="preview-no-access"
      >
        <Lock className="text-muted-foreground mb-4 h-12 w-12" />
        <p className="text-muted-foreground text-center">
          Bạn không có quyền xem preview tài liệu này
        </p>
      </div>
    );
  }

  // Render empty state
  if (previews.length === 0) {
    return (
      <div
        className={cn(
          'bg-muted flex min-h-[500px] flex-col items-center justify-center rounded-lg',
          className,
        )}
        data-testid="preview-empty"
      >
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
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border',
        className,
      )}
      data-testid="preview-panel"
    >
      {/* Preview toolbar */}
      <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 border-b p-2">
        {/* Page navigation */}
        <div
          className="flex items-center gap-1"
          data-testid="navigation-controls"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            aria-label="Trang trước"
            data-testid="prev-page-btn"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <form
            onSubmit={handlePageInputSubmit}
            className="flex items-center gap-1"
          >
            <Input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              onBlur={handlePageInputBlur}
              className="h-8 w-12 text-center text-sm"
              aria-label="Số trang"
              data-testid="page-input"
            />
            <span className="text-muted-foreground text-sm">
              / {totalPages}
            </span>
          </form>

          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            aria-label="Trang sau"
            data-testid="next-page-btn"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1" data-testid="zoom-controls">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Thu nhỏ"
            data-testid="zoom-out-btn"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetZoom}
            className="min-w-[60px]"
            aria-label="Đặt lại zoom"
            data-testid="zoom-reset-btn"
          >
            {Math.round(zoom * 100)}%
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Phóng to"
            data-testid="zoom-in-btn"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {isOwner && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              title="Tạo lại preview"
              aria-label="Tạo lại preview"
              data-testid="regenerate-btn"
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Preview image area */}
      <div
        className="bg-muted relative flex min-h-[500px] flex-1 items-center justify-center overflow-auto p-4"
        data-testid="preview-image-area"
      >
        {isImageLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {currentPreview && !imageLoadError.has(currentPage) ? (
          <img
            src={currentPreview.previewUrl}
            alt={`Preview trang ${currentPage}`}
            className="max-w-full transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            onError={() => handleImageError(currentPage)}
            onLoad={handleImageLoad}
            data-testid="preview-image"
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
      {totalPages > 1 && (
        <div
          className="flex gap-2 overflow-x-auto border-t p-2"
          data-testid="thumbnail-strip"
        >
          {previews.map(preview => (
            <button
              key={preview.id}
              className={cn(
                'flex-shrink-0 overflow-hidden rounded border-2 transition-all',
                currentPage === preview.pageNumber
                  ? 'border-primary ring-primary/20 ring-2'
                  : 'border-transparent hover:border-gray-300',
              )}
              onClick={() => goToPage(preview.pageNumber)}
              aria-label={`Đi đến trang ${preview.pageNumber}`}
              aria-current={
                currentPage === preview.pageNumber ? 'page' : undefined
              }
              data-testid={`thumbnail-${preview.pageNumber}`}
              data-active={currentPage === preview.pageNumber}
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
    </div>
  );
}
