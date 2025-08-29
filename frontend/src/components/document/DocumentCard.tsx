import { Download, ExternalLink, Eye, User } from 'lucide-react';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { triggerFileDownload } from '@/services/document.service';
import { Document } from '@/services/files.service';

interface DocumentCardProps {
  document: Document;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

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

  const onViewDetails = () => {
    navigate(`/documents/${document.id}`);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="flex flex-col w-full hover:shadow-lg transition-all duration-200 group">
      <CardHeader className="pb-3 w-full">
        <div className="flex items-start justify-between w-full">
          <CardTitle
            className="truncate text-lg cursor-pointer hover:text-primary transition-colors group-hover:text-primary"
            onClick={onViewDetails}
          >
            {document.title || 'Untitled'}
          </CardTitle>
          {document.category && (
            <Badge variant="secondary" className="text-xs">
              {document.category.name}
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm text-muted-foreground line-clamp-2">
          {document.description || 'No description available'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow pb-3 w-full">
        <div className="space-y-3 w-full">
          {/* File Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground w-full">
            <span>File Size</span>
            <span className="font-medium">
              {document.files && document.files.length > 0
                ? formatFileSize(
                    document.files.reduce((total, file) => total + Number(file.fileSize), 0)
                  )
                : 'Unknown'}
            </span>
          </div>

          {/* Uploader Info */}
          <div className="flex items-center text-sm text-muted-foreground w-full">
            <User className="mr-2 h-4 w-4" />
            <span className="truncate">
              {document.uploader?.firstName
                ? `${document.uploader.firstName} ${document.uploader.lastName || ''}`.trim()
                : 'Anonymous'}
            </span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm w-full">
            <div className="flex items-center text-muted-foreground">
              <Eye className="mr-1 h-4 w-4" />
              <span>{document.viewCount || 0}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Download className="mr-1 h-4 w-4" />
              <span>{document.downloadCount || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2 pt-0 w-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={onViewDetails}
              className="hover:bg-primary hover:text-primary-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>View details</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={onDownload}
              disabled={isDownloading}
              className="min-w-[100px]"
            >
              <Download className={`h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`} />
              {isDownloading ? (
                <span className="ml-2">Downloading...</span>
              ) : (
                <span className="ml-2">Download</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isDownloading ? 'Preparing download...' : 'Download document'}</p>
          </TooltipContent>
        </Tooltip>
      </CardFooter>
    </Card>
  );
};

export default DocumentCard;
