import { Download, ExternalLink, Eye, User } from 'lucide-react';

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { downloadFile } from '@/services/document.service';
import { Document } from '@/services/files.service';
import { UploadedFile } from '@/services/upload.service';

import { Button } from '../ui/button';
import DocumentViewer from './DocumentViewer';

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

  const firstFile = document.files[0] as unknown as UploadedFile;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="truncate text-lg">{document.title || 'Untitled'}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm text-gray-500 space-y-2">
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>{document.uploader?.firstName || 'Anonymous'}</span>
          </div>
          <div className="flex items-center">
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
        <DocumentViewer file={firstFile} />
        <Button size="sm" variant="outline" onClick={onViewDetails}>
          <ExternalLink className="mr-2 h-4 w-4" /> View Details
        </Button>
        <Button size="sm" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" /> Download
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DocumentCard;
