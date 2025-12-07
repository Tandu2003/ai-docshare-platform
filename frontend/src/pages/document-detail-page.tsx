import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { DocumentAIAnalysis } from '@/components/documents/document-ai-analysis';
import { DocumentComments } from '@/components/documents/document-comments';
import { DocumentDetailHeader } from '@/components/documents/document-detail-header';
import { DocumentEditSheet } from '@/components/documents/document-edit-sheet';
import { DocumentPreviewModal } from '@/components/documents/document-preview-modal';
import { DocumentShareDialog } from '@/components/documents/document-share-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { RatingService } from '@/services/rating.service';
import { UploadService } from '@/services/upload.service';
import type { AIAnalysis, Comment } from '@/types';
import { getLanguageName } from '@/utils/language';

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
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [isCheckingDownloadStatus, setIsCheckingDownloadStatus] =
    useState(false);

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

  useEffect(() => {
    const fetchDocumentData = async () => {
      if (!documentId) return;

      setLoading(true);
      try {
        // Use real API to fetch document
        const foundDocument = await getDocumentById(documentId, apiKey);
        setDocument(foundDocument);

        // Load comments for this document
        const documentComments = await CommentsService.getComments(documentId);
        setComments(documentComments);

        // Load AI analysis from document (already included by API)
        setAiAnalysis(foundDocument.aiAnalysis ?? null);

        // Load user's rating
        try {
          const rating = await RatingService.getUserRating(documentId);
          setUserRating(rating);
        } catch (ratingError) {
          // Could not load user rating
        }
      } catch (error: any) {
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
      } catch (error) {
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

    // Function to join document room
    const joinDocumentRoomSafe = () => {
      if (!isMounted) return;
      socket.emit('document:join', { documentId });
    };

    // If already connected, join immediately
    if (socket.connected) {
      joinDocumentRoomSafe();
    }

    // Always listen for connect event (for initial connect and reconnects)
    const handleConnect = () => {
      joinDocumentRoomSafe();
    };

    socket.on('connect', handleConnect);

    // Define document update event types
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
            // Check if this is a reply (has parentId)
            if (event.comment.parentId) {
              // Add reply to parent comment
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
              // Add new top-level comment
              setComments(prev => [...prev, event.comment!]);
            }
          }
          break;

        case 'comment_updated':
          if (event.commentId && event.likesCount !== undefined) {
            // Update like count for the comment
            // Need to handle nested replies too
            const updateLikeCount = (comments: Comment[]): Comment[] => {
              return comments.map(comment => {
                if (comment.id === event.commentId) {
                  return {
                    ...comment,
                    likesCount: event.likesCount!,
                    // Only update isLiked if the current user is the one who liked/unliked
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

    // Cleanup
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

    // Track if this is a first-time download (for updating count)
    const isFirstDownload = !hasDownloaded && !isOwner;

    try {
      const result = await triggerFileDownload(documentId, document?.title);

      // Silently update UI state if download was confirmed
      // No toast shown - file has been fetched to browser, user decides to save or not
      if (result.confirmed) {
        setHasDownloaded(true);

        // Update download count in UI if this was a first-time download by non-owner
        // Backend has already incremented the count in database
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
      // Don't show any toast - download is triggered, user will see Save dialog
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
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

    // Kiểm tra nếu document là private và đang truy cập qua API key
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

      // Refresh document to get updated average rating
      const updatedDocument = await getDocumentById(documentId, apiKey);
      setDocument(updatedDocument);

      toast.success('Đã cập nhật đánh giá');
    } catch (err) {
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
        // Comment will be added via realtime event (document:update)
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

    // Helper function to update comment in nested structure
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

    // Optimistic update
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
      // Update with actual server response
      setComments(prev =>
        updateCommentLike(prev, commentId, result.likesCount, result.isLiked),
      );
    } catch (err) {
      toast.error('Không thể thực hiện hành động');
      // Revert optimistic update
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

  // Handler for document update from edit sheet
  const handleDocumentUpdated = (updatedDocument: DocumentView) => {
    setDocument(updatedDocument);
    setEditSheetOpen(false);
    toast.success('Đã cập nhật tài liệu thành công');
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
                {/* Title and badges */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>

                {/* Author info */}
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>

                {/* Stats and actions */}
                <div className="flex flex-wrap items-center gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>

                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-24" />
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>

                {/* Rating */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-8 w-40" />
                </div>

                {/* Category and tags */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Skeleton - Vertical Layout */}
        <div className="space-y-6">
          {/* Document Info Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Description */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-18" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Details Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Owner Management Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comment input */}
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-9 w-24 ml-auto" />
              </div>

              {/* Comment items */}
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-3 border-t pt-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Analysis Card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
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

      {/* Preview Modal */}
      <DocumentPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        documentId={document.id}
        previews={document.previews}
        previewStatus={document.previewStatus}
        previewCount={document.previewCount}
        isOwner={isOwner}
        hasAccess={true}
        apiKey={apiKey}
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
        onPreview={() => setPreviewModalOpen(true)}
        userRating={userRating}
        isBookmarked={isBookmarked}
        isBookmarking={isBookmarkActionLoading}
        isRatingLoading={isRatingLoading}
        hasDownloaded={hasDownloaded}
        isCheckingDownloadStatus={isCheckingDownloadStatus}
        isOwner={isOwner}
      />

      {/* Main Content - Vertical Layout */}
      <div className="space-y-6">
        {/* Document Info - Visible to everyone */}
        <Card>
            <CardHeader>
              <CardTitle>Thông tin tài liệu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Language */}
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Ngôn ngữ</p>
                  <span className="font-medium">
                    {document.language
                      ? getLanguageName(document.language)
                      : 'N/A'}
                  </span>
                </div>

                {/* Updated date */}
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Cập nhật lần cuối
                  </p>
                  <span>
                    {new Date(document.updatedAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                {/* Total file size */}
                {document.files && document.files.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">
                      Tổng dung lượng
                    </p>
                    <span className="font-medium">
                      {UploadService.formatFileSize(
                        document.files.reduce((total, file) => {
                          const size =
                            typeof file.fileSize === 'string'
                              ? parseInt(file.fileSize, 10)
                              : file.fileSize || 0;
                          return total + size;
                        }, 0),
                      )}
                    </span>
                  </div>
                )}

                {/* Preview status */}
                {document.previewStatus && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">
                      Trạng thái preview
                    </p>
                    <Badge
                      variant={
                        document.previewStatus === 'COMPLETED'
                          ? 'default'
                          : document.previewStatus === 'FAILED'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {document.previewStatus === 'COMPLETED'
                        ? 'Hoàn thành'
                        : document.previewStatus === 'PROCESSING'
                          ? 'Đang xử lý'
                          : document.previewStatus === 'FAILED'
                            ? 'Thất bại'
                            : 'Chờ xử lý'}
                    </Badge>
                  </div>
                )}

                {/* Preview count */}
                {document.previewCount !== undefined &&
                  document.previewCount > 0 && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        Số trang preview
                      </p>
                      <span className="font-medium">
                        {document.previewCount} trang
                      </span>
                    </div>
                  )}
              </div>

              {/* ZIP file info */}
              {document.zipFileUrl && (
                <div className="bg-muted/50 space-y-1 rounded-md border p-3">
                  <p className="text-muted-foreground text-xs font-medium">
                    File ZIP đã tạo
                  </p>
                  <p className="text-sm">
                    {document.zipFileCreatedAt
                      ? `Tạo lúc: ${new Date(document.zipFileCreatedAt).toLocaleString('vi-VN')}`
                      : 'Đã có sẵn'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        {/* File Details - Show all files */}
        {document.files && document.files.length > 0 && (
          <Card>
              <CardHeader>
                <CardTitle>Danh sách file</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {document.files
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((file, index) => (
                    <div
                      key={file.id}
                      className="flex items-start justify-between rounded-md border p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            #{index + 1}
                          </span>
                          <p className="text-sm font-medium">
                            {file.originalName || file.fileName}
                          </p>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-3 text-xs">
                          <span>
                            {UploadService.formatFileSize(
                              typeof file.fileSize === 'string'
                                ? parseInt(file.fileSize, 10)
                                : file.fileSize || 0,
                            )}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span>{file.mimeType}</span>
                        </div>
                      </div>
                    </div>
                  ))}
            </CardContent>
          </Card>
        )}

        {/* Document Edit Sheet */}
        {isOwner && document && (
          <DocumentEditSheet
            open={editSheetOpen}
            onOpenChange={setEditSheetOpen}
            document={document}
            onDocumentUpdated={handleDocumentUpdated}
          />
        )}

        {/* Comments */}
        <DocumentComments
          comments={comments}
          onAddComment={handleAddComment}
          onLikeComment={handleLikeComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          currentUserId={user?.id}
        />

        {/* AI Analysis */}
        {aiAnalysis && <DocumentAIAnalysis analysis={aiAnalysis} />}
      </div>
    </div>
  );
}
