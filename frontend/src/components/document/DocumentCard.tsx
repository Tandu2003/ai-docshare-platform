import { Download, ExternalLink, Eye, User } from 'lucide-react';

import React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { downloadFile } from '@/services/document.service';
import { Document } from '@/services/files.service';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface DocumentCardProps {
  document: Document;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  const navigate = useNavigate();

  const onDownload = async () => {
    try {
      await downloadFile(document.id, document.title || 'document');
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const onViewDetails = () => {
    navigate(`/documents/${document.id}`);
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle
          className="truncate text-lg cursor-pointer hover:text-blue-600 transition-colors"
          onClick={onViewDetails}
        >
          {document.title || 'Untitled'}
        </CardTitle>
        <CardDescription className="text-sm text-gray-500">{document.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm text-gray-500 space-y-2 flex justify-between items-center">
          <div className="flex items-center mb-0">
            <User className="mr-2 h-4 w-4" />
            <span>{document.uploader?.firstName || 'Anonymous'}</span>
          </div>
          <div className="flex items-center mb-0">
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            <p>Download all files</p>
          </TooltipContent>
        </Tooltip>
      </CardFooter>
    </Card>
  );
};

export default DocumentCard;
