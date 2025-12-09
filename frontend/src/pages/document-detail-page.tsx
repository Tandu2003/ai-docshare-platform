import { useEffect, useMemo, useState, type ReactElement } from 'react';

import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DocumentAIAnalysis } from '@/components/documents/document-ai-analysis';
import { DocumentComments } from '@/components/documents/document-comments';
import { DocumentDetailHeader } from '@/components/documents/document-detail-header';
import { DocumentEditSheet } from '@/components/documents/document-edit-sheet';
import { DocumentPreviewPanel } from '@/components/documents/document-preview-panel';
import { DocumentShareDialog } from '@/components/documents/document-share-dialog';
import { DocumentSidebar } from '@/components/documents/document-sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks';
import { getSocket } from '@/lib/socket';
import {
  createBookmark,
  deleteBookmark,
  getUserBookmarks,
  type BookmarkWithDocument,
} from '@/services/bookmark.service';
import { CommentsService } from '@/services/comments.service';
import {
  checkDownloadStatus,
  getDocumentById,
  triggerFileDownload,
  type DocumentShareLink,
  type DocumentView,
  type ShareDocumentResponse,
} from '@/services/document.service';
import { PreviewService } from '@/services/preview.service';
import { RatingService } from '@/services/rating.service';
import type { AIAnalysis, Comment } from '@/types';

const AUTO_REFRESH_INTERVAL = 25000; // 25 seconds

export function DocumentDetailPage(): ReactElement {
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
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [isCheckingDownloadStatus, setIsCheckingDownloadStatus] =
    useState(false);

  // Preview state - moved from modal to page level
  const [previews, setPreviews] = useState(document?.previews || []);
  const [previewStatus, setPreviewStatus] = useState(
    document?.previewStatus || 'PENDING',
  );

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

  // Fetch document data
  useEffect(() => {
    const fetchDocumentData = async () => {
      if (!documentId) return;

      setLoading(true);
      try {
        const foundDocument = await getDocumentById(documentId, apiKey);
        setDocument(foundDocument);
        setPreviews(foundDocument.previews || []);
        setPreviewStatus(foundDocument.previewStatus || 'PENDING');

        const documentComments = await CommentsService.getComments(documentId);
        setComments(documentComments);

        setAiAnalysis(foundDocument.aiAnalysis ?? null);

        try {
          const rating = await RatingService.getUserRating(documentId);
          setUserRating(rating);
        } catch {
          // Could not load user rating
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Không thể tải thông tin tài liệu.';
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    void fetchDocumentData();
  }, [apiKey, documentId]);

  // Auto-refresh preview URLs
  useEffect(() => {
    if (!documentId || previewStatus !== 'COMPLETED' || previews.length === 0)
      return;

    const refreshPreviews = async () => {
      try {
        const result = await PreviewService.getDocumentPreviews(
          documentId,
          apiKey,
        );
        setPreviews(result.previews);
      } catch {
        // Failed to refresh previews - silent fail
      }
    };

    const intervalId = setInterval(refreshPreviews, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [documentId, apiKey, previewStatus, previews.length]);

  // Handle preview regeneration complete
  const handlePreviewRegenerateComplete = () => {
    // Refresh document to get updated preview data
    if (documentId) {
      void getDocumentById(documentId, apiKey).then(doc => {
        setDocument(doc);
        setPreviews(doc.previews || []);
        setPreviewStatus(doc.previewStatus || 'COMPLETED');
      });
    }
  };

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
      } catch {
        // Failed to load bookmark status
      }
    };

    void fetchBookmarkStatus();
  }, [documentId, user]);

  // Check if user has already downloaded this document
  useEffect(() => {
    const fetchDownloadStatus = async () => {
      if (!documentId || !user) {
        setHasDownloaded(false);
        return;
      }

      try {
        setIsCheckingDownloadStatus(true);
        const { hasDownloaded: downloaded } =
          await checkDownloadStatus(documentId);
        setHasDownloaded(downloaded);
      } catch {
        setHasDownloaded(false);
      } finally {
        setIsCheckingDownloadStatus(false);
      }
    };

    void fetchDownloadStatus();
  }, [documentId, user]);

  // Realtime listener for document updates (comments, likes)
  useEffect(() => {
    if (!documentId) return;

    let isMounted = true;
    const socket = getSocket();

    const joinDocumentRoomSafe = () => {
      if (!isMounted) return;
      socket.emit('document:join', { documentId });
    };

    if (socket.connected) {
      joinDocumentRoomSafe();
    }

    const handleConnect = () => {
      joinDocumentRoomSafe();
    };

    socket.on('connect', handleConnect);

    interface DocumentUpdateEvent {
      type: 'new_comment' | 'comment_updated' | 'comment_deleted';
      documentId: string;
      comment?: Comment;
      commentId?: string;
      likesCount?: number;
      isLiked?: boolean;
      likerId?: string;
    }

    const handleDocumentUpdate = (event: DocumentUpdateEvent) => {
      if (event.documentId !== documentId) return;

      switch (event.type) {
        case 'new_comment':
          if (event.comment) {
            if (event.comment.parentId) {
              setComments(prev =>
                prev.map(comment =>
                  comment.id === event.comment!.parentId
                    ? {
                        ...comment,
                        replies: [...(comment.replies || []), event.comment!],
                      }
                    : comment,
                ),
              );
            } else {
              setComments(prev => [...prev, event.comment!]);
            }
          }
          break;

        case 'comment_updated':
          if (event.commentId && event.likesCount !== undefined) {
            const updateLikeCount = (comments: Comment[]): Comment[] => {
              return comments.map(comment => {
                if (comment.id === event.commentId) {
                  return {
                    ...comment,
                    likesCount: event.likesCount!,
                    isLiked:
                      event.likerId === user?.id
                        ? event.isLiked
                        : comment.isLiked,
                  };
                }
                if (comment.replies && comment.replies.length > 0) {
                  return {
                    ...comment,
                    replies: updateLikeCount(comment.replies),
                  };
                }
                return comment;
              });
            };

            setComments(prev => updateLikeCount(prev));
          }
          break;

        case 'comment_deleted':
          if (event.commentId) {
            setComments(prev =>
              prev.filter(comment => comment.id !== event.commentId),
            );
          }
          break;
      }
    };

    socket.on('document:update', handleDocumentUpdate);

    return () => {
      isMounted = false;
      socket.off('connect', handleConnect);
      socket.off('document:update', handleDocumentUpdate);
      if (socket.connected) {
        socket.emit('document:leave', { documentId });
      }
    };
  }, [documentId, user?.id]);

  const handleDownload = async () => {
    if (!documentId) return;

    const isFirstDownload = !hasDownloaded && !isOwner;

    try {
      const result = await triggerFileDownload(documentId, document?.title);

      if (result.confirmed) {
        setHasDownloaded(true);

        if (isFirstDownload && document) {
          setDocument(prev =>
            prev
              ? {
                  ...prev,
                  downloadCount: prev.downloadCount + 1,
                }
              : prev,
          );
        }
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể tải xuống tài liệu';
      toast.error(errorMessage);
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

    if (apiKey && !document.isPublic) {
      toast.error(
        'Tài liệu riêng tư không thể đánh dấu khi chia sẻ qua API key',
      );
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
        const created = await createBookmark(
          {
            documentId,
            isFromApiKey: !!apiKey,
          },
          apiKey,
        );
        setBookmarkRecord(created);
        setIsBookmarked(true);
        toast.success('Đã lưu vào bookmark');
      }
    } catch (error) {
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
        .catch(() => {
          // Share was cancelled or failed
        });
    } else {
      navigator.clipboard
        .writeText(shareLinkUrl)
        .then(() => toast.success('Đã sao chép đường dẫn chia sẻ.'))
        .catch(() => {
          toast.error('Không thể sao chép đường dẫn.');
        });
    }
  };

  const handleRate = async (rating: number) => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để đánh giá tài liệu');
      return;
    }

    if (!documentId || isRatingLoading) return;

    try {
      setIsRatingLoading(true);
      await RatingService.setUserRating(documentId, rating);
      setUserRating(rating);

      const updatedDocument = await getDocumentById(documentId, apiKey);
      setDocument(updatedDocument);

      toast.success('Đã cập nhật đánh giá');
    } catch {
      toast.error('Không thể cập nhật đánh giá');
    } finally {
      setIsRatingLoading(false);
    }
  };

  const handleAddComment = (content: string, parentId?: string) => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để bình luận');
      return;
    }

    if (!documentId) return;

    CommentsService.addComment(documentId, { content, parentId })
      .then(() => {
        toast.success('Đã thêm bình luận');
      })
      .catch(() => {
        toast.error('Không thể thêm bình luận');
      });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để thích bình luận');
      return;
    }

    if (!documentId) return;

    const updateCommentLike = (
      comments: Comment[],
      targetId: string,
      likesCount: number,
      isLiked: boolean,
    ): Comment[] => {
      return comments.map(comment => {
        if (comment.id === targetId) {
          return { ...comment, likesCount, isLiked };
        }
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateCommentLike(
              comment.replies,
              targetId,
              likesCount,
              isLiked,
            ),
          };
        }
        return comment;
      });
    };

    const findComment = (
      comments: Comment[],
      targetId: string,
    ): Comment | undefined => {
      for (const comment of comments) {
        if (comment.id === targetId) return comment;
        if (comment.replies) {
          const found = findComment(comment.replies, targetId);
          if (found) return found;
        }
      }
      return undefined;
    };

    const currentComment = findComment(comments, commentId);
    const currentlyLiked = currentComment?.isLiked || false;
    const optimisticLikesCount = currentlyLiked
      ? (currentComment?.likesCount || 1) - 1
      : (currentComment?.likesCount || 0) + 1;

    setComments(prev =>
      updateCommentLike(prev, commentId, optimisticLikesCount, !currentlyLiked),
    );

    try {
      const result = await CommentsService.likeComment(documentId, commentId);
      setComments(prev =>
        updateCommentLike(prev, commentId, result.likesCount, result.isLiked),
      );
    } catch {
      toast.error('Không thể thực hiện hành động');
      setComments(prev =>
        updateCommentLike(
          prev,
          commentId,
          currentComment?.likesCount || 0,
          currentlyLiked,
        ),
      );
    }
  };

  const handleEditComment = (commentId: string, content: string) => {
    if (!documentId) return;
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId
          ? { ...comment, content, isEdited: true, editedAt: new Date() }
          : comment,
      ),
    );
    CommentsService.editComment(documentId, commentId, content).catch(() => {
      toast.error('Không thể sửa bình luận');
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!documentId) return;
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId ? { ...comment, isDeleted: true } : comment,
      ),
    );
    CommentsService.deleteComment(documentId, commentId).catch(() => {
      toast.error('Không thể xóa bình luận');
    });
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

  const handleDocumentUpdated = (updatedDocument: DocumentView) => {
    setDocument(updatedDocument);
    setEditSheetOpen(false);
    toast.success('Đã cập nhật tài liệu thành công');
  };

  const handleEditDocument = () => {
    setEditSheetOpen(true);
  };

  if (loading) {
    return <DocumentDetailPageSkeleton />;
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

      {/* Document Header - Sticky Action Bar */}
      <DocumentDetailHeader
        document={document}
        onDownload={handleDownload}
        onBookmark={() => {
          void handleBookmark();
        }}
        onShare={handleShare}
        isBookmarked={isBookmarked}
        isBookmarking={isBookmarkActionLoading}
        hasDownloaded={hasDownloaded}
        isCheckingDownloadStatus={isCheckingDownloadStatus}
        isOwner={isOwner}
      />

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
        {/* Left Column - Preview Panel (70%) */}
        <div className="min-w-0">
          <DocumentPreviewPanel
            documentId={document.id}
            previews={previews}
            previewStatus={previewStatus}
            previewCount={document.previewCount}
            isOwner={isOwner}
            hasAccess={true}
            apiKey={apiKey}
            onRegenerateComplete={handlePreviewRegenerateComplete}
            className="min-h-[600px]"
          />
        </div>

        {/* Right Column - Sidebar (30%) */}
        <div className="min-w-0">
          <DocumentSidebar
            document={document}
            userRating={userRating}
            onRate={handleRate}
            isRatingLoading={isRatingLoading}
            isOwner={isOwner}
            onEdit={handleEditDocument}
          />
        </div>
      </div>

      {/* Full Width Sections Below */}
      <div className="space-y-6">
        {/* Document Edit Sheet */}
        {isOwner && document && (
          <DocumentEditSheet
            open={editSheetOpen}
            onOpenChange={setEditSheetOpen}
            document={document}
            onDocumentUpdated={handleDocumentUpdated}
          />
        )}

        {/* Comments Section */}
        <DocumentComments
          comments={comments}
          onAddComment={handleAddComment}
          onLikeComment={handleLikeComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          currentUserId={user?.id}
        />

        {/* AI Analysis Section */}
        {aiAnalysis && <DocumentAIAnalysis analysis={aiAnalysis} />}
      </div>
    </div>
  );
}

// Skeleton component for loading state
function DocumentDetailPageSkeleton(): ReactElement {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="bg-background/95 sticky top-0 z-40 border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Two Column Layout Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_350px]">
        {/* Preview Panel Skeleton */}
        <div className="min-h-[600px] rounded-lg border">
          <div className="bg-muted/50 flex items-center justify-between border-b p-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
          <div className="bg-muted flex min-h-[500px] items-center justify-center">
            <Skeleton className="h-[400px] w-[300px]" />
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-4 rounded-lg border p-4">
          {/* Rating Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-6 w-32" />
          </div>

          <Skeleton className="h-px w-full" />

          {/* Document Info Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>

          <Skeleton className="h-px w-full" />

          {/* Statistics Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>

          <Skeleton className="h-px w-full" />

          {/* Tags Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-14" />
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section Skeleton */}
      <div className="space-y-4 rounded-lg border p-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
