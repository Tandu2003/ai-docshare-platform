import { Download, Eye, User } from 'lucide-react'
import React from 'react'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { downloadFile } from '@/services/document.service'
import { UploadedFile } from '@/services/upload.service'

import { Button } from '../ui/button'
import DocumentViewer from './DocumentViewer'

interface DocumentCardProps {
  file: UploadedFile;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ file }) => {
  const onDownload = async () => {
    try {
      await downloadFile(file.id, file.title || file.originalName);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="truncate text-lg">{file.title || file.originalName}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm text-gray-500 space-y-2">
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>{file.uploader.firstName || 'Anonymous'}</span>
          </div>
          <div className="flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            <span>{file.viewCount || 0} views</span>
          </div>
          <div className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            <span>{file.downloadCount || 0} downloads</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <DocumentViewer file={file} />
        <Button size="sm" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" /> Download
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DocumentCard;
