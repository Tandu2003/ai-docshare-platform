import React, { useState } from 'react';

import { Download, ExternalLink, Eye, User } from 'lucide-react';
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
import { triggerFileDownload } from '@/services/document.service';
import { Document } from '@/services/files.service';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

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
            <span>{document.downloadCount || 0} downloads</span>
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
            <p>View detail</p>
          </TooltipContent>
        </Tooltip>
        <DocumentPermissionGate document={document} action="download">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={onDownload} disabled={isDownloading}>
                <Download
                  className={`h-4 w-4 ${isDownloading ? 'animate-spin' : ''}`}
                />
                {isDownloading && <span className="ml-2">Downloading...</span>}
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              <p>
                {isDownloading ? 'Preparing download...' : 'Download all files'}
              </p>
            </TooltipContent>
          </Tooltip>
        </DocumentPermissionGate>
      </CardFooter>
    </Card>
  );
};

export default DocumentCard;
