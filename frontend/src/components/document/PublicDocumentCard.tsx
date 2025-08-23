import { Download, ExternalLink, Eye, FileText, User } from 'lucide-react';

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Document, DocumentsService } from '@/services/files.service';

interface PublicDocumentCardProps {
  document: Document;
}

const PublicDocumentCard: React.FC<PublicDocumentCardProps> = ({ document }) => {
  const navigate = useNavigate();

  const onDownload = async () => {
    try {
      await DocumentsService.downloadDocument(document.id);
    } catch (error) {
      alert((error as Error).message);
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

  const getTotalFileSize = () => {
    return document.files.reduce((total, file) => total + file.fileSize, 0);
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
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return '📊';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📊';

    return '📄'; // Default document icon
  };

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="text-3xl">{getDocumentIcon()}</div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2">{document.title}</CardTitle>
            {document.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{document.description}</p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow">
        <div className="space-y-3">
          {/* File Info */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="h-4 w-4" />
            <span>
              {document.files.length} file{document.files.length !== 1 ? 's' : ''}
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

      <CardFooter className="pt-0 flex gap-2">
        <Button onClick={onViewDetails} variant="outline" className="flex-1" size="sm">
          <ExternalLink className="mr-2 h-4 w-4" />
          View Details
        </Button>
        <Button onClick={onDownload} className="flex-1" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PublicDocumentCard;
