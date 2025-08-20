import {
  ArrowLeft,
  Calendar,
  Download,
  ExternalLink,
  Eye,
  FileText,
  MessageSquare,
  Star,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DocumentView,
  downloadFile,
  getDocumentById,
  viewDocument,
} from '@/services/document.service';

const DocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setError('Document ID not provided');
      setLoading(false);
      return;
    }

    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get document details
      const documentData = await getDocumentById(documentId!);
      setDocument(documentData);

      // Track view (non-blocking)
      await viewDocument(documentId!, {
        referrer: window.document.referrer || window.location.href,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
      console.error('Error fetching document:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      setDownloading(fileId);
      await downloadFile(fileId, fileName);
      toast.success('File downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download file');
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes: bigint): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Number(bytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Alert>
            <AlertDescription>Document not found</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Document Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold mb-2">{document.title}</CardTitle>
                {document.description && (
                  <p className="text-muted-foreground mb-4">{document.description}</p>
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {document.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    <span>{document.viewCount} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{document.downloadCount} downloads</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    <span>
                      {document.averageRating.toFixed(1)} ({document.totalRatings} ratings)
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{document.stats.commentsCount} comments</span>
                  </div>
                </div>
              </div>

              {/* Premium Badge */}
              {document.isPremium && (
                <Badge variant="default" className="ml-4">
                  Premium
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Document Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Files */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Files ({document.files.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {document.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{file.originalName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {file.mimeType.split('/')[1].toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.fileSize)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {file.storageUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.storageUrl, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDownload(file.id, file.originalName)}
                          disabled={downloading === file.id}
                        >
                          {downloading === file.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Uploader Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Uploaded by
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={document.uploader.avatar} />
                    <AvatarFallback>
                      {document.uploader.firstName[0]}
                      {document.uploader.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {document.uploader.firstName} {document.uploader.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">@{document.uploader.username}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Meta */}
            <Card>
              <CardHeader>
                <CardTitle>Document Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-muted-foreground">{document.category.name}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium">Language</p>
                  <p className="text-sm text-muted-foreground">{document.language.toUpperCase()}</p>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Published
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDate(document.createdAt)}</p>
                </div>

                {document.updatedAt !== document.createdAt && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Last updated
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(document.updatedAt)}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailPage;
