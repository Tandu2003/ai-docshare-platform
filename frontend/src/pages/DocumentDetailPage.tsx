import { useEffect, useMemo, useState } from 'react';

import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DocumentAIAnalysis } from '@/components/documents/document-ai-analysis';
import { DocumentComments } from '@/components/documents/document-comments';
import { DocumentDetailHeader } from '@/components/documents/document-detail-header';
import DocumentShareDialog from '@/components/documents/document-share-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks';
import {
  createBookmark,
  deleteBookmark,
  getUserBookmarks,
  type BookmarkWithDocument,
} from '@/services/bookmark.service';
import {
  getDocumentById,
  triggerFileDownload,
  type DocumentShareLink,
  type DocumentView,
  type ShareDocumentResponse,
} from '@/services/document.service';
import {
  generateMockAIAnalysis,
  mockComments,
} from '@/services/mock-data.service';
import type { AIAnalysis, Comment } from '@/types';

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
  const [bookmarkRecord, setBookmarkRecord] =
    useState<BookmarkWithDocument | null>(null);
  const [isBookmarkActionLoading, setIsBookmarkActionLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const apiKey = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('apiKey') ?? undefined;
  }, [location.search]);

  const isOwner = useMemo(() => {
    if (!document || !user) return false;
    return document.uploader.id === user.id;
  }, [document, user]);

  const activeShareLink =
    document?.shareLink && !document.shareLink.isRevoked
      ? document.shareLink
      : undefined;

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
          comment => comment.documentId === documentId,
        );
        setComments(documentComments);

        // Generate AI analysis
        const analysis = generateMockAIAnalysis(documentId);
        setAiAnalysis(analysis);

        // Simulate user's rating while API is not ready
        setUserRating(Math.floor(Math.random() * 5) + 1);
      } catch (error: any) {
        console.error('Failed to fetch document:', error);
        toast.error(error.message || 'Không thể tải thông tin tài liệu.');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentData();
  }, [apiKey, documentId]);

  useEffect(() => {
    const fetchBookmarkStatus = async () => {
      if (!documentId || !user) {
        setBookmarkRecord(null);
        setIsBookmarked(false);
        return;
      }

      try {
        const [bookmark] = await getUserBookmarks({ documentId });
        setBookmarkRecord(bookmark ?? null);
        setIsBookmarked(Boolean(bookmark));
      } catch (error) {
        console.error('Failed to load bookmark status', error);
      }
    };

    void fetchBookmarkStatus();
  }, [documentId, user]);

  const handleDownload = async () => {
    if (!documentId) return;

    try {
      await triggerFileDownload(documentId, document?.title);
    } catch (error) {
      console.error('Failed to download document:', error);
    }
  };

  const handleBookmark = async () => {
    if (!documentId || !document) {
      return;
    }

    if (!user) {
      toast.error('Bạn cần đăng nhập để sử dụng bookmark.');
      return;
    }

    if (isBookmarkActionLoading) {
      return;
    }

    try {
      setIsBookmarkActionLoading(true);
      if (bookmarkRecord) {
        await deleteBookmark(bookmarkRecord.id);
        setBookmarkRecord(null);
        setIsBookmarked(false);
        toast.success('Đã xóa khỏi bookmark');
      } else {
        const created = await createBookmark({ documentId });
        setBookmarkRecord(created);
        setIsBookmarked(true);
        toast.success('Đã lưu vào bookmark');
      }
    } catch (error) {
      console.error('Failed to update bookmark', error);
      toast.error(
        error instanceof Error ? error.message : 'Không thể cập nhật bookmark',
      );
    } finally {
      setIsBookmarkActionLoading(false);
    }
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
        .catch(error => console.warn('Share was cancelled or failed', error));
    } else {
      navigator.clipboard
        .writeText(shareLinkUrl)
        .then(() => toast.success('Đã sao chép đường dẫn chia sẻ.'))
        .catch(error => {
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
      setComments(prev =>
        prev.map(comment =>
          comment.id === parentId
            ? { ...comment, replies: [...(comment.replies || []), newComment] }
            : comment,
        ),
      );
    } else {
      // Add as top-level comment
      setComments(prev => [...prev, newComment]);
    }
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId
          ? { ...comment, likesCount: comment.likesCount + 1 }
          : comment,
      ),
    );
  };

  const handleEditComment = (commentId: string, content: string) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId
          ? { ...comment, content, isEdited: true, editedAt: new Date() }
          : comment,
      ),
    );
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId ? { ...comment, isDeleted: true } : comment,
      ),
    );
  };

  const handleShareLinkUpdated = (share: ShareDocumentResponse) => {
    setDocument(prev =>
      prev
        ? {
            ...prev,
            shareLink: {
              token: share.token,
              expiresAt: share.expiresAt,
              isRevoked: share.isRevoked,
            } as DocumentShareLink,
          }
        : prev,
    );
  };

  const handleShareLinkRevoked = () => {
    setDocument(prev => (prev ? { ...prev, shareLink: undefined } : prev));
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
          <div className="space-y-6 lg:col-span-2">
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
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h2 className="text-muted-foreground mb-2 text-2xl font-bold">
            Không tìm thấy tài liệu
          </h2>
          <p className="text-muted-foreground">
            Tài liệu bạn đang tìm kiếm không tồn tại.
          </p>
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
        onBookmark={() => {
          void handleBookmark();
        }}
        onShare={handleShare}
        onRate={handleRate}
        userRating={userRating}
        isBookmarked={isBookmarked}
        isBookmarking={isBookmarkActionLoading}
      />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document Content */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Nội dung tài liệu</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-muted-foreground">
                  Đây là bản xem trước nội dung tài liệu. Trong ứng dụng thực
                  tế, phần này sẽ hiển thị nội dung tài liệu thực tế dựa trên
                  loại tệp.
                </p>
                <div className="bg-muted mt-4 rounded-lg p-4">
                  <h4 className="mb-2 font-medium">Xem trước tài liệu</h4>
                  <p className="text-muted-foreground text-sm">
                    {document.description || 'Không có mô tả nào.'}
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
                    <div className="bg-muted/40 rounded-md border border-dashed p-3 text-xs leading-relaxed">
                      <span className="text-muted-foreground font-medium">
                        Đường dẫn:
                      </span>
                      <br />
                      <span className="break-all">{shareLinkUrl}</span>
                    </div>
                    {shareExpiresAtLabel && (
                      <p className="text-muted-foreground text-xs">
                        Liên kết sẽ hết hạn vào {shareExpiresAtLabel}.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Bạn chưa thiết lập liên kết chia sẻ cho tài liệu này.
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShareDialogOpen(true)}
                >
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
              <CardTitle>Thống kê tài liệu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Lượt tải</span>
                <span className="font-medium">{document.downloadCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Lượt xem</span>
                <span className="font-medium">{document.viewCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Đánh giá trung bình
                </span>
                <span className="font-medium">
                  {document.averageRating.toFixed(1)}/5
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Tổng đánh giá
                </span>
                <span className="font-medium">{document.totalRatings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Bình luận</span>
                <span className="font-medium">{comments.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Related Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Tài liệu liên quan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Tài liệu liên quan sẽ được hiển thị ở đây khi API hỗ trợ.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
