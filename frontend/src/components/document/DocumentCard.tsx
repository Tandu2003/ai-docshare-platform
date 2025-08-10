import { Download, Eye, User } from 'lucide-react'
import React from 'react'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { UploadedFile, UploadService } from '@/services/upload.service'

import { Button } from '../ui/button'
import DocumentViewer from './DocumentViewer'

interface DocumentCardProps {
  file: UploadedFile;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ file }) => {
  const handleDownload = async () => {
    try {
      const downloadUrl = await UploadService.getDownloadUrl(file.id);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Failed to get download URL', error);
      alert('Could not get download link.');
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="truncate text-lg">{file.originalName}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-sm text-gray-500 space-y-2">
          <div className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            <span>{file.uploader.firstName || 'Anonymous'}</span>
          </div>
          <div className="flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            <span>{file.documents?.[0]?.viewCount || 0} views</span>
          </div>
          <div className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            <span>{file.documents?.[0]?.downloadCount || 0} downloads</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <DocumentViewer file={file} />
        <Button size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" /> Download
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DocumentCard;
