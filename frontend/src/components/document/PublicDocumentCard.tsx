import React, { useState } from 'react';

import { Download, ExternalLink, Eye, FileText, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  trackDocumentView,
  triggerFileDownload,
} from '@/services/document.service';
import { Document } from '@/services/files.service';
import { getDocumentStatusInfo, getStatusIcon } from '@/utils/document-status';

interface PublicDocumentCardProps {
  document: Document;
}

const PublicDocumentCard: React.FC<PublicDocumentCardProps> = ({
  document,
}) => {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  const statusInfo = getDocumentStatusInfo(
    document.isApproved,
    document.moderationStatus,
  );

  const onDownload = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      await triggerFileDownload(document.id, document.title);
    } catch (error) {
      alert((error as Error).message);
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTotalFileSize = () => {
    return document.files.reduce(
      (total, file) => total + Number(file.fileSize),
      0,
    );
  };

  const getDocumentIcon = () => {
    if (document.files.length === 0) return '📄';

    const firstFile = document.files[0];
    const mimeType = firstFile.mimeType;

    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('image')) return '🖼️';
    if (mimeType?.includes('video')) return '🎥';
    if (mimeType?.includes('audio')) return '🎵';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet'))
      return '📊';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation'))
      return '📊';

    return '📄'; // Default document icon
  };

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="text-3xl">{getDocumentIcon()}</div>
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-2 text-lg">
              {document.title}
            </CardTitle>
            {document.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                {document.description}
              </p>
            )}
          </div>
        </div>

        {/* Review Status Badge */}
        <div className="mt-3">
          <Badge
            variant={statusInfo.variant}
            className={`${statusInfo.className} text-xs`}
          >
            <span className="mr-1">{getStatusIcon(statusInfo)}</span>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-grow">
        <div className="space-y-3">
          {/* File Info */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="h-4 w-4" />
            <span>
              {document.files.length} file
              {document.files.length !== 1 ? 's' : ''}
            </span>
            <span>•</span>
            <span>{formatFileSize(getTotalFileSize())}</span>
          </div>

          {/* Uploader Info */}
          {document.uploader && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="h-4 w-4" />
              <span>
                {document.uploader.firstName} {document.uploader.lastName}
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{document.viewCount || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              <span>{document.downloadCount || 0}</span>
            </div>
          </div>

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {document.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {document.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{document.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Category */}
          {document.category && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {document.category.name}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        <Button
          onClick={onViewDetails}
          variant="outline"
          className="flex-1"
          size="sm"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Xem chi tiết
        </Button>
        <Button
          onClick={onDownload}
          className="flex-1"
          size="sm"
          disabled={isDownloading}
        >
          <Download
            className={`mr-2 h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`}
          />
          {isDownloading ? 'Đang tải xuống...' : 'Tải xuống'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PublicDocumentCard;
