import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DocumentAIAnalysis } from '@/components/documents/document-ai-analysis';
import { DocumentComments } from '@/components/documents/document-comments';
import { DocumentDetailHeader } from '@/components/documents/document-detail-header';
import { DocumentShareDialog } from '@/components/documents/document-share-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { generateMockAIAnalysis, mockComments } from '@/services/mock-data.service';
import {
  getDocumentById,
  triggerFileDownload,
  type DocumentShareLink,
  type DocumentView,
  type ShareDocumentResponse,
} from '@/services/document.service';
import type { AIAnalysis, Comment } from '@/types';
import { useAuth } from '@/hooks';

export default function DocumentDetailPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const [document, setDocument] = useState<DocumentView | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const apiKey = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('apiKey') ?? undefined;
  }, [location.search]);

  const isOwner = useMemo(() => {
    if (!document || !user) return false;
    return document.uploader.id === user.id;
  }, [document, user]);

  const activeShareLink = document?.shareLink && !document.shareLink.isRevoked ? document.shareLink : undefined;

  const shareLinkUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    if (activeShareLink?.token) {
      return `${window.location.origin}/documents/${document?.id}?apiKey=${activeShareLink.token}`;
    }
    if (apiKey) {
      return `${window.location.origin}${location.pathname}?apiKey=${apiKey}`;
    }
    return window.location.href;
  }, [activeShareLink?.token, apiKey, document?.id, location.pathname]);

  const shareExpiresAtLabel = useMemo(() => {
    if (!activeShareLink?.expiresAt) return null;
    const expiresAtDate = new Date(activeShareLink.expiresAt);
    if (Number.isNaN(expiresAtDate.getTime())) return null;
    return expiresAtDate.toLocaleString();
  }, [activeShareLink?.expiresAt]);

  useEffect(() => {
    const fetchDocumentData = async () => {
      if (!documentId) return;

      setLoading(true);
      try {
        // Use real API to fetch document
        const foundDocument = await getDocumentById(documentId, apiKey);
        setDocument(foundDocument);

        // Load comments for this document
        const documentComments = mockComments.filter(
          (comment) => comment.documentId === documentId
        );
        setComments(documentComments);

        // Generate AI analysis
        const analysis = generateMockAIAnalysis(documentId);
        setAiAnalysis(analysis);

        // Simulate user's rating and bookmark status
        setUserRating(Math.floor(Math.random() * 5) + 1);
        setIsBookmarked(Math.random() > 0.5);
      } catch (error: any) {
        console.error('Failed to fetch document:', error);
        toast.error(error.message || 'Không thể tải thông tin tài liệu.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentData();
  }, [apiKey, documentId]);

  const handleDownload = async () => {
    if (!documentId) return;
    
    try {
      await triggerFileDownload(documentId, document?.title);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    console.log('Bookmark toggled:', !isBookmarked);
  };

  const handleShare = () => {
    if (isOwner) {
      setShareDialogOpen(true);
      return;
    }

    if (!shareLinkUrl) {
      toast.error('Không tìm thấy đường dẫn để chia sẻ.');
      return;
    }

    if (navigator.share) {
      navigator
        .share({
          title: document?.title,
          text: document?.description,
          url: shareLinkUrl,
        })
        .catch((error) => console.warn('Share was cancelled or failed', error));
    } else {
      navigator.clipboard
        .writeText(shareLinkUrl)
        .then(() => toast.success('Đã sao chép đường dẫn chia sẻ.'))
        .catch((error) => {
          console.error('Failed to copy link', error);
          toast.error('Không thể sao chép đường dẫn.');
        });
    }
  };

  const handleRate = (rating: number) => {
    setUserRating(rating);
    console.log('Rating updated:', rating);
    // In real app, this would send rating to API
  };

  const handleAddComment = (content: string, parentId?: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      userId: 'current-user',
      documentId: documentId!,
      parentId,
      content,
      isEdited: false,
      isDeleted: false,
      likesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: {
        id: 'current-user',
        email: 'user@example.com',
        username: 'currentuser',
        password: '',
        firstName: 'Current',
        lastName: 'User',
        roleId: 'user',
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: {
          id: 'user',
          name: 'User',
          description: 'Regular user',
          permissions: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      document: {
        ...document!,
        uploaderId: document!.uploader.id,
        categoryId: document!.category.id,
      } as any,
    };

    if (parentId) {
      // Add as reply
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === parentId
            ? { ...comment, replies: [...(comment.replies || []), newComment] }
            : comment
        )
      );
    } else {
      // Add as top-level comment
      setComments((prev) => [...prev, newComment]);
    }
  };

  const handleLikeComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, likesCount: comment.likesCount + 1 } : comment
      )
    );
  };

  const handleEditComment = (commentId: string, content: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, content, isEdited: true, editedAt: new Date() }
          : comment
      )
    );
  };

  const handleDeleteComment = (commentId: string) => {
    setComments((prev) =>
      prev.map((comment) => (comment.id === commentId ? { ...comment, isDeleted: true } : comment))
    );
  };

  const handleShareLinkUpdated = (share: ShareDocumentResponse) => {
    setDocument((prev) =>
      prev
        ? {
            ...prev,
            shareLink: {
              token: share.token,
              expiresAt: share.expiresAt,
              isRevoked: share.isRevoked,
            } as DocumentShareLink,
          }
        : prev
    );
  };

  const handleShareLinkRevoked = () => {
    setDocument((prev) => (prev ? { ...prev, shareLink: undefined } : prev));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-32" />
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground mb-2">Document Not Found</h2>
          <p className="text-muted-foreground">The document you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        documentId={document.id}
        shareLink={document.shareLink}
        onShareLinkUpdated={handleShareLinkUpdated}
        onShareLinkRevoked={handleShareLinkRevoked}
      />
      {/* Document Header */}
      <DocumentDetailHeader
        document={document}
        onDownload={handleDownload}
        onBookmark={handleBookmark}
        onShare={handleShare}
        onRate={handleRate}
        userRating={userRating}
        isBookmarked={isBookmarked}
      />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-muted-foreground">
                  This is a preview of the document content. In a real application, this would
                  display the actual document content based on its file type.
                </p>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Document Preview</h4>
                  <p className="text-sm text-muted-foreground">
                    {document.description || 'No description available.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          <DocumentComments
            comments={comments}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            currentUserId="current-user"
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Chia sẻ tài liệu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeShareLink ? (
                  <>
                    <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs leading-relaxed">
                      <span className="font-medium text-muted-foreground">Đường dẫn:</span>
                      <br />
                      <span className="break-all">{shareLinkUrl}</span>
                    </div>
                    {shareExpiresAtLabel && (
                      <p className="text-xs text-muted-foreground">
                        Liên kết sẽ hết hạn vào {shareExpiresAtLabel}.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Bạn chưa thiết lập liên kết chia sẻ cho tài liệu này.
                  </p>
                )}
                <Button variant="outline" className="w-full" onClick={() => setShareDialogOpen(true)}>
                  Quản lý liên kết chia sẻ
                </Button>
              </CardContent>
            </Card>
          )}

          {/* AI Analysis */}
          {aiAnalysis && <DocumentAIAnalysis analysis={aiAnalysis} />}

          {/* Document Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Document Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Downloads</span>
                <span className="font-medium">{document.downloadCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Views</span>
                <span className="font-medium">{document.viewCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Average Rating</span>
                <span className="font-medium">{document.averageRating.toFixed(1)}/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Ratings</span>
                <span className="font-medium">{document.totalRatings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Comments</span>
                <span className="font-medium">{comments.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Related Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Related Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Related documents will be shown here when the API supports it.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
