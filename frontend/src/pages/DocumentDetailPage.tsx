import { useEffect, useMemo, useState } from 'react';

import { Edit2, Plus, RefreshCw, Save, Sparkles, X } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { CategorySelector } from '@/components/categories';
import { DocumentAIAnalysis } from '@/components/documents/document-ai-analysis';
import { DocumentComments } from '@/components/documents/document-comments';
import { DocumentDetailHeader } from '@/components/documents/document-detail-header';
import { DocumentInlineViewer } from '@/components/documents/document-inline-viewer';
import { DocumentPreviewViewer } from '@/components/documents/document-preview-viewer';
import DocumentShareDialog from '@/components/documents/document-share-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import { DocumentsService } from '@/services/files.service';
import { RatingService } from '@/services/rating.service';
import type { AIAnalysis, Comment } from '@/types';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'Tiếng Anh' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'es', label: 'Tiếng Tây Ban Nha' },
  { value: 'fr', label: 'Tiếng Pháp' },
  { value: 'de', label: 'Tiếng Đức' },
  { value: 'zh', label: 'Tiếng Trung' },
  { value: 'ja', label: 'Tiếng Nhật' },
  { value: 'ko', label: 'Tiếng Hàn' },
];

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
  const [isRatingLoading, setIsRatingLoading] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [isCheckingDownloadStatus, setIsCheckingDownloadStatus] =
    useState(false);
  const [isEditingDownloadCost, setIsEditingDownloadCost] = useState(false);
  const [editDownloadCost, setEditDownloadCost] = useState<number | null>(null);
  const [isSavingDownloadCost, setIsSavingDownloadCost] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [metaForm, setMetaForm] = useState<{
    title: string;
    description: string;
    categoryId: string;
    tags: string[];
    language: string;
    isPublic: boolean;
    filesEdited: boolean;
  }>({
    title: '',
    description: '',
    categoryId: '',
    tags: [],
    language: 'en',
    isPublic: false,
    filesEdited: false,
  });

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
        setMetaForm({
          title: foundDocument.title ?? '',
          description: foundDocument.description ?? '',
          categoryId: foundDocument.category?.id ?? foundDocument.categoryId ?? '',
          tags: foundDocument.tags || [],
          language: foundDocument.language || 'en',
          isPublic: foundDocument.isPublic,
          filesEdited: false,
        });
        setTagInput('');

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
          console.warn('Could not load user rating', ratingError);
        }
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
        console.error('Failed to check download status', error);
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
      console.log(
        '🔌 Joining document room:',
        documentId,
        'Socket connected:',
        socket.connected,
        'Socket id:',
        socket.id,
      );
      socket.emit('document:join', { documentId });
    };

    // If already connected, join immediately
    if (socket.connected) {
      console.log('🔌 Socket already connected, joining room immediately');
      joinDocumentRoomSafe();
    }

    // Always listen for connect event (for initial connect and reconnects)
    const handleConnect = () => {
      console.log('🔌 Socket connect event fired, socket id:', socket.id);
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
      console.log('📄 Document update received:', event);

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
        console.log('🔌 Emitted document:leave for:', documentId);
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
      console.error('Failed to download document:', error);
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
      console.error('Failed to set rating', err);
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
      .catch(err => {
        console.error('Failed to add comment', err);
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
      console.error('Failed to toggle like comment', err);
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
    CommentsService.editComment(documentId, commentId, content).catch(err => {
      console.error('Failed to edit comment', err);
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
    CommentsService.deleteComment(documentId, commentId).catch(err => {
      console.error('Failed to delete comment', err);
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

  const handleSaveDownloadCost = async () => {
    if (!documentId) return;

    try {
      setIsSavingDownloadCost(true);
      const updatedDocument = await DocumentsService.updateDocument(
        documentId,
        {
          downloadCost: editDownloadCost,
        },
      );
      // Update local state with new originalDownloadCost
      setDocument(prev =>
        prev
          ? {
              ...prev,
              originalDownloadCost:
                updatedDocument.originalDownloadCost ?? editDownloadCost,
            }
          : prev,
      );
      setIsEditingDownloadCost(false);
      toast.success('Đã cập nhật điểm tải xuống');
    } catch (error: any) {
      console.error('Failed to update download cost:', error);
      toast.error(error.message || 'Không thể cập nhật điểm tải xuống');
    } finally {
      setIsSavingDownloadCost(false);
    }
  };

  const handleCancelEditDownloadCost = () => {
    setIsEditingDownloadCost(false);
    setEditDownloadCost(document?.originalDownloadCost ?? null);
  };

  const handleStartEditDownloadCost = () => {
    setEditDownloadCost(document?.originalDownloadCost ?? null);
    setIsEditingDownloadCost(true);
  };

  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag) return;
    setMetaForm(prev => ({
      ...prev,
      tags: Array.from(new Set([...(prev.tags || []), nextTag])),
    }));
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setMetaForm(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(t => t !== tag),
    }));
  };

  const willNeedReModeration = useMemo(() => {
    if (!document) return false;
    const goingPublic = !document.isPublic && metaForm.isPublic;
    return metaForm.filesEdited || goingPublic;
  }, [document, metaForm.filesEdited, metaForm.isPublic]);

  const handleSaveMeta = async () => {
    if (!documentId || !document) return;

    const payload: Record<string, any> = {};

    if (metaForm.title.trim() !== document.title) {
      payload.title = metaForm.title.trim();
    }
    if ((metaForm.description || '') !== (document.description || '')) {
      payload.description = metaForm.description;
    }
    if (
      metaForm.categoryId &&
      metaForm.categoryId !== (document.category?.id || document.categoryId)
    ) {
      payload.categoryId = metaForm.categoryId;
    }
    if (metaForm.language !== document.language) {
      payload.language = metaForm.language;
    }
    if (metaForm.isPublic !== document.isPublic) {
      payload.isPublic = metaForm.isPublic;
    }
    const tagsChanged =
      (metaForm.tags || []).join('|') !== (document.tags || []).join('|');
    if (tagsChanged) {
      payload.tags = metaForm.tags;
    }
    if (metaForm.filesEdited) {
      payload.filesEdited = true;
    }

    if (Object.keys(payload).length === 0) {
      toast.info('Không có thay đổi nào để lưu');
      setIsEditingMeta(false);
      return;
    }

    try {
      setIsSavingMeta(true);
      const response = await DocumentsService.updateDocument(
        documentId,
        payload,
      );
      const updatedDocument = response?.data ?? response;

      if (!updatedDocument) {
        throw new Error('Không nhận được phản hồi cập nhật');
      }

      setDocument(prev =>
        prev
          ? {
              ...prev,
              ...updatedDocument,
              tags: updatedDocument.tags ?? prev.tags,
              language: updatedDocument.language ?? prev.language,
              isPublic:
                updatedDocument.isPublic !== undefined
                  ? updatedDocument.isPublic
                  : prev.isPublic,
              isApproved:
                updatedDocument.isApproved !== undefined
                  ? updatedDocument.isApproved
                  : prev.isApproved,
              moderationStatus:
                updatedDocument.moderationStatus ?? prev.moderationStatus,
              title: updatedDocument.title ?? prev.title,
              description:
                updatedDocument.description !== undefined
                  ? updatedDocument.description
                  : prev.description,
              category:
                updatedDocument.category !== undefined
                  ? updatedDocument.category
                  : prev.category,
            }
          : prev,
      );

      setMetaForm({
        title: updatedDocument.title ?? metaForm.title,
        description:
          updatedDocument.description !== undefined
            ? updatedDocument.description || ''
            : metaForm.description,
        categoryId:
          updatedDocument.category?.id ??
          updatedDocument.categoryId ??
          metaForm.categoryId,
        tags: updatedDocument.tags ?? metaForm.tags,
        language: updatedDocument.language ?? metaForm.language,
        isPublic:
          updatedDocument.isPublic !== undefined
            ? updatedDocument.isPublic
            : metaForm.isPublic,
        filesEdited: false,
      });

      setIsEditingMeta(false);

      if (updatedDocument.needsReModeration || willNeedReModeration) {
        toast.success(
          response?.message ||
            'Đã cập nhật. Tài liệu sẽ được kiểm duyệt lại trước khi công khai.',
        );
      } else {
        toast.success(response?.message || 'Đã cập nhật tài liệu');
      }
    } catch (error: any) {
      console.error('Failed to update metadata:', error);
      toast.error(error.message || 'Không thể cập nhật tài liệu');
    } finally {
      setIsSavingMeta(false);
    }
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
        isRatingLoading={isRatingLoading}
        hasDownloaded={hasDownloaded}
        isCheckingDownloadStatus={isCheckingDownloadStatus}
        isOwner={isOwner}
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
              {/* For non-owners: Show preview images only */}
              {/* For owners: Show tabs to switch between preview and full viewer */}
              {isOwner ? (
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="full">Xem đầy đủ</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview">
                    <DocumentPreviewViewer
                      documentId={document.id}
                      previews={document.previews}
                      previewStatus={document.previewStatus}
                      previewCount={document.previewCount}
                      isOwner={isOwner}
                      hasAccess={true}
                      apiKey={apiKey}
                    />
                  </TabsContent>
                  <TabsContent value="full">
                    <DocumentInlineViewer files={document.files} />
                  </TabsContent>
                </Tabs>
              ) : (
                <DocumentPreviewViewer
                  documentId={document.id}
                  previews={document.previews}
                  previewStatus={document.previewStatus}
                  previewCount={document.previewCount}
                  isOwner={false}
                  hasAccess={true}
                  apiKey={apiKey}
                />
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <DocumentComments
            comments={comments}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
            currentUserId={user?.id}
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

          {/* Owner: Update metadata */}
          {isOwner && (
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center justify-between">
                  <span>Chỉnh sửa tài liệu</span>
                  {!isEditingMeta && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingMeta(true)}
                    >
                      <Edit2 className="mr-1 h-4 w-4" />
                      Sửa
                    </Button>
                  )}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Các trường cơ bản không cần duyệt lại. Thay đổi tệp đính kèm
                  hoặc chuyển sang công khai sẽ yêu cầu kiểm duyệt.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isEditingMeta ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-muted-foreground">Tiêu đề</span>
                        <span className="font-medium line-clamp-1">
                          {document.title}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-muted-foreground">Danh mục</span>
                        <span className="font-medium">
                          {document.category?.name || 'Chưa chọn'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-muted-foreground">Ngôn ngữ</span>
                        <span className="font-medium uppercase">
                          {document.language}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <span className="text-muted-foreground">Công khai</span>
                        <span className="font-medium">
                          {document.isPublic ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Thẻ</p>
                        <div className="flex flex-wrap gap-2">
                          {(document.tags || []).length > 0 ? (
                            document.tags.map(tag => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Không có thẻ
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingMeta(true)}
                      >
                        Chỉnh sửa nhanh
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tiêu đề</Label>
                      <Input
                        value={metaForm.title}
                        onChange={e =>
                          setMetaForm(prev => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Nhập tiêu đề"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mô tả</Label>
                      <Textarea
                        value={metaForm.description}
                        onChange={e =>
                          setMetaForm(prev => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Thêm mô tả ngắn gọn"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Danh mục</Label>
                      <CategorySelector
                        value={metaForm.categoryId}
                        onChange={categoryId =>
                          setMetaForm(prev => ({ ...prev, categoryId }))
                        }
                        disabled={isSavingMeta}
                        showAiSuggestions={false}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Thẻ</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Nhập thẻ và nhấn Enter"
                        />
                        <Button type="button" size="icon" onClick={handleAddTag}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {metaForm.tags.length > 0 ? (
                          metaForm.tags.map(tag => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Chưa có thẻ
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Ngôn ngữ</Label>
                      <Select
                        value={metaForm.language}
                        onValueChange={value =>
                          setMetaForm(prev => ({ ...prev, language: value }))
                        }
                        disabled={isSavingMeta}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn ngôn ngữ" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3 rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Công khai</p>
                          <p className="text-muted-foreground text-xs">
                            Chuyển sang công khai sẽ cần duyệt lại.
                          </p>
                        </div>
                        <Switch
                          checked={metaForm.isPublic}
                          onCheckedChange={value =>
                            setMetaForm(prev => ({ ...prev, isPublic: value }))
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            Tôi đã chỉnh sửa tệp đính kèm
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Đánh dấu để yêu cầu kiểm duyệt lại tệp.
                          </p>
                        </div>
                        <Switch
                          checked={metaForm.filesEdited}
                          onCheckedChange={value =>
                            setMetaForm(prev => ({ ...prev, filesEdited: value }))
                          }
                        />
                      </div>
                      {willNeedReModeration && (
                        <Alert className="border-amber-200 bg-amber-50">
                          <Sparkles className="h-4 w-4" />
                          <AlertTitle>Cần kiểm duyệt lại</AlertTitle>
                          <AlertDescription>
                            Thay đổi của bạn sẽ được gửi tới kiểm duyệt trước
                            khi hiển thị công khai.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={handleSaveMeta}
                        disabled={isSavingMeta}
                      >
                        {isSavingMeta ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Đang lưu...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Lưu thay đổi
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingMeta(false);
                          setMetaForm(prev => ({
                            ...prev,
                            title: document.title ?? '',
                            description: document.description ?? '',
                            categoryId:
                              document.category?.id ?? document.categoryId ?? '',
                            tags: document.tags || [],
                            language: document.language || 'en',
                            isPublic: document.isPublic,
                            filesEdited: false,
                          }));
                          setTagInput('');
                        }}
                        disabled={isSavingMeta}
                      >
                        Hủy
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Download Cost Settings - Owner Only */}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Điểm tải xuống</span>
                  {!isEditingDownloadCost && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleStartEditDownloadCost}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditingDownloadCost ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={editDownloadCost ?? ''}
                        onChange={e => {
                          const value = e.target.value;
                          setEditDownloadCost(
                            value === '' ? null : parseInt(value, 10),
                          );
                        }}
                        placeholder="Mặc định hệ thống"
                        className="w-full"
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Để trống để sử dụng cài đặt mặc định của hệ thống.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveDownloadCost}
                        disabled={isSavingDownloadCost}
                        className="flex-1"
                      >
                        <Save className="mr-1 h-4 w-4" />
                        {isSavingDownloadCost ? 'Đang lưu...' : 'Lưu'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEditDownloadCost}
                        disabled={isSavingDownloadCost}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Chi phí tải xuống
                      </span>
                      <span className="font-medium">
                        {document.originalDownloadCost !== undefined &&
                        document.originalDownloadCost !== null
                          ? `${document.originalDownloadCost} điểm`
                          : `${document.systemDefaultDownloadCost ?? 0} điểm (mặc định)`}
                      </span>
                    </div>
                    {document.originalDownloadCost === null ||
                    document.originalDownloadCost === undefined ? (
                      <p className="text-muted-foreground text-xs">
                        Đang sử dụng giá mặc định của hệ thống. Bạn có thể đặt
                        giá riêng cho tài liệu này.
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Giá tùy chỉnh. Để trống khi chỉnh sửa để sử dụng mặc
                        định hệ thống ({document.systemDefaultDownloadCost ?? 0}{' '}
                        điểm).
                      </p>
                    )}
                  </>
                )}
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
        </div>
      </div>
    </div>
  );
}
