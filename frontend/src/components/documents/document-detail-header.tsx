import type { ReactElement } from 'react';

import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  Download,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { DocumentPermissionGate } from '@/components/common/permission-gate';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DocumentView } from '@/services/document.service';

interface DocumentDetailHeaderProps {
  document: DocumentView;
  onDownload: () => void;
  onBookmark: () => void;
  onShare: () => void;
  isBookmarked?: boolean;
  isBookmarking?: boolean;
  hasDownloaded?: boolean;
  isCheckingDownloadStatus?: boolean;
  isOwner?: boolean;
}

export function DocumentDetailHeader({
  document,
  onDownload,
  onBookmark,
  onShare,
  isBookmarked = false,
  isBookmarking = false,
  hasDownloaded = false,
  isCheckingDownloadStatus = false,
  isOwner = false,
}: DocumentDetailHeaderProps) {
  function renderModerationBadge(): ReactElement | null {
    if (document.moderationStatus === 'REJECTED') {
      return <Badge variant="destructive">Đã từ chối</Badge>;
    }
    if (document.isApproved || document.moderationStatus === 'APPROVED') {
      return <Badge variant="default">Đã duyệt</Badge>;
    }
    return <Badge variant="secondary">Chờ duyệt</Badge>;
  }

  function renderNeedsModerationWarning(): ReactElement | null {
    if (!document.needsReModeration) return null;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Chờ kiểm duyệt lại
      </Badge>
    );
  }

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        {/* Left: Back button + Title + Author */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/documents" aria-label="Quay lại tài liệu">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Author Avatar */}
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {document.uploader.firstName.charAt(0)}
                {document.uploader.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Title and Author Info */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold sm:text-base">
                {document.title}
              </h1>
              <p className="text-muted-foreground truncate text-xs">
                {document.uploader.firstName} {document.uploader.lastName}
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="hidden items-center gap-2 sm:flex">
            {document.isPremium && (
              <Badge variant="default" className="bg-yellow-500">
                Premium
              </Badge>
            )}
            {renderModerationBadge()}
            {renderNeedsModerationWarning()}
            {document.isDraft && <Badge variant="outline">Draft</Badge>}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex shrink-0 items-center gap-2">
          <DocumentPermissionGate document={document} action="download">
            <Button
              onClick={onDownload}
              size="sm"
              className="flex items-center gap-1"
              disabled={isCheckingDownloadStatus}
            >
              {isCheckingDownloadStatus ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : hasDownloaded && !isOwner ? (
                <Check className="h-4 w-4" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isOwner ? (
                  'Tải xuống'
                ) : hasDownloaded ? (
                  <>
                    Tải lại
                    <span className="ml-1 text-xs text-green-300">
                      (Miễn phí)
                    </span>
                  </>
                ) : (
                  <>
                    Tải xuống
                    {document.downloadCost !== undefined &&
                      document.downloadCost > 0 && (
                        <span className="ml-1 text-xs">
                          ({document.downloadCost} điểm)
                        </span>
                      )}
                  </>
                )}
              </span>
            </Button>
          </DocumentPermissionGate>

          <Button
            variant={isBookmarked ? 'default' : 'outline'}
            size="sm"
            onClick={onBookmark}
            disabled={isBookmarking}
            className={isBookmarked ? 'bg-primary text-primary-foreground' : ''}
            aria-busy={isBookmarking}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
            <span className="sr-only">
              {isBookmarked ? 'Xóa khỏi đánh dấu' : 'Thêm vào đánh dấu'}
            </span>
          </Button>

          <DocumentPermissionGate document={document} action="share">
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="h-4 w-4" />
              <span className="sr-only">Chia sẻ</span>
            </Button>
          </DocumentPermissionGate>
        </div>
      </div>

      {/* Mobile Status Badges - shown below on small screens */}
      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2 sm:hidden">
        {document.isPremium && (
          <Badge variant="default" className="bg-yellow-500">
            Premium
          </Badge>
        )}
        {renderModerationBadge()}
        {renderNeedsModerationWarning()}
        {document.isDraft && <Badge variant="outline">Draft</Badge>}
      </div>
    </div>
  );
}
