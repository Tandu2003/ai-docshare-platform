import React, { useEffect, useState } from 'react';

import {
  Bot,
  Check,
  Download,
  ExternalLink,
  Eye,
  User,
  UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DocumentPermissionGate } from '@/components/common/permission-gate';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks';
import {
  checkDownloadStatus,
  trackDocumentView,
  triggerFileDownload,
} from '@/services/document.service';
import { Document } from '@/types/database.types';
import { getDocumentStatusInfo, getStatusIcon } from '@/utils/document-status';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface DocumentCardProps {
  document: Document;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [localDownloadCount, setLocalDownloadCount] = useState(
    document.downloadCount || 0,
  );

  // Check if current user is the owner
  const isOwner = user?.id === document.uploader?.id;

  const statusInfo = getDocumentStatusInfo(
    document.isApproved,
    document.moderationStatus,
  );

  // Check if user has already downloaded this document
  useEffect(() => {
    const fetchDownloadStatus = async () => {
      if (!document.id || !user) {
        setHasDownloaded(false);
        return;
      }

      try {
        const { hasDownloaded: downloaded } = await checkDownloadStatus(
          document.id,
        );
        setHasDownloaded(downloaded);
      } catch (error) {
        console.error('Failed to check download status', error);
        setHasDownloaded(false);
      }
    };

    void fetchDownloadStatus();
  }, [document.id, user]);

  const onDownload = async () => {
    if (isDownloading) return;

    // Track if this is a first-time download (for updating count)
    const isFirstDownload = !hasDownloaded && !isOwner;

    try {
      setIsDownloading(true);
      const result = await triggerFileDownload(document.id, document.title);

      // Silently update state if download was confirmed
      // No notification - file has been fetched, user decides to save or not
      if (result.confirmed) {
        setHasDownloaded(true);

        // Update download count in UI if this was a first-time download by non-owner
        // Backend has already incremented the count in database
        if (isFirstDownload) {
          setLocalDownloadCount(prev => prev + 1);
        }
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Không thể tải xuống tài liệu';
      alert(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  const onViewDetails = async () => {
    // Track view before navigating
    if (document.isPublic && document.isApproved) {
      await trackDocumentView(document.id, window.location.href);
    }
    navigate(`/documents/${document.id}`);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle
          className="cursor-pointer truncate text-lg transition-colors hover:text-blue-600"
          onClick={onViewDetails}
        >
          {document.title || 'Untitled'}
        </CardTitle>
        <CardDescription className="text-sm text-gray-500">
          {document.description}
        </CardDescription>

        {/* Review Status Badge */}
        <div className="mt-2">
          <Badge
            variant={statusInfo.variant}
            className={`${statusInfo.className} text-xs`}
          >
            <span className="mr-1">{getStatusIcon(statusInfo)}</span>
            {statusInfo.label}
          </Badge>
        </div>

        {/* Moderation Info */}
        {document.moderatedAt && (
          <div className="mt-2 flex items-center gap-2">
            {document.moderatedById ? (
              <Badge
                variant="outline"
                className="border-blue-600 text-blue-600"
              >
                <UserCheck className="mr-1 h-3 w-3" />
                Admin duyệt
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="border-green-600 text-green-600"
              >
                <Bot className="mr-1 h-3 w-3" />
                AI duyệt
              </Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {new Date(document.moderatedAt).toLocaleDateString('vi-VN')}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center justify-between space-y-2 text-sm text-gray-500">
          <div className="mb-0 flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>{document.uploader?.firstName || 'Anonymous'}</span>
          </div>
          <div className="mb-0 flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            <span>{document.viewCount || 0} views</span>
          </div>
          <div className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            <span>{localDownloadCount} downloads</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={onViewDetails}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            <p>Xem chi tiết</p>
          </TooltipContent>
        </Tooltip>
        <DocumentPermissionGate document={document} action="download">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={onDownload} disabled={isDownloading}>
                {hasDownloaded ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Download
                    className={`h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`}
                  />
                )}
                {isDownloading ? (
                  <span className="ml-2">Đang tải xuống...</span>
                ) : hasDownloaded ? (
                  <span className="ml-2 text-green-600">
                    Tải lại (Miễn phí)
                  </span>
                ) : document.downloadCost !== undefined &&
                  document.downloadCost > 0 ? (
                  <span className="ml-2">{document.downloadCost} điểm</span>
                ) : null}
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              <p>
                {isDownloading
                  ? 'Đang chuẩn bị tải xuống...'
                  : hasDownloaded
                    ? 'Bạn đã tải tài liệu này - Tải lại miễn phí!'
                    : document.downloadCost !== undefined &&
                        document.downloadCost > 0
                      ? `Tải xuống (${document.downloadCost} điểm)`
                      : 'Tải xuống tất cả'}
              </p>
            </TooltipContent>
          </Tooltip>
        </DocumentPermissionGate>
      </CardFooter>
    </Card>
  );
};

export { DocumentCard };
