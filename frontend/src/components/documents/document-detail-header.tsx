import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Bot,
  Download,
  Eye,
  Share2,
  Star,
  User,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { DocumentPermissionGate } from '@/components/common/permission-gate';
import { RatingStars } from '@/components/documents/rating-stars';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { DocumentView } from '@/services/document.service';
import { formatDate } from '@/utils/date';

interface DocumentDetailHeaderProps {
  document: DocumentView;
  onDownload: () => void;
  onBookmark: () => void;
  onShare: () => void;
  onRate: (rating: number) => void;
  userRating?: number;
  isBookmarked?: boolean;
  isBookmarking?: boolean;
  isRatingLoading?: boolean;
}

export function DocumentDetailHeader({
  document,
  onDownload,
  onBookmark,
  onShare,
  onRate,
  userRating = 0,
  isBookmarked = false,
  isBookmarking = false,
  isRatingLoading = false,
}: DocumentDetailHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link to="/documents" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Quay lại tài liệu
        </Link>
      </Button>

      {/* Document Header */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Title and Status */}
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  {document.title}
                </h1>
                {document.description && (
                  <p className="text-muted-foreground text-lg">
                    {document.description}
                  </p>
                )}
              </div>
              <div className="ml-4 flex items-center gap-2">
                {document.isPremium && (
                  <Badge variant="default" className="bg-yellow-500">
                    Premium
                  </Badge>
                )}
                {document.isApproved ? (
                  <Badge variant="default">Approved</Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
                {document.isDraft && <Badge variant="outline">Draft</Badge>}
              </div>
            </div>

            {/* Author Info */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {document.uploader.firstName.charAt(0)}
                  {document.uploader.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {document.uploader.firstName} {document.uploader.lastName}
                </p>
                <p className="text-muted-foreground text-sm">
                  @{document.uploader.username}
                </p>
              </div>
            </div>

            {/* Moderation Info */}
            {document.moderatedAt && (
              <div className="bg-muted/50 rounded-lg border p-4">
                <div className="mb-2 flex items-center space-x-2">
                  {document.moderatedById ? (
                    <UserCheck className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Bot className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm font-medium">
                    {document.moderatedById
                      ? 'Admin duyệt'
                      : 'AI tự động duyệt'}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {new Date(document.moderatedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                {document.moderationNotes && (
                  <p className="text-muted-foreground text-sm">
                    {document.moderationNotes}
                  </p>
                )}
              </div>
            )}

            <Separator />

            {/* Stats and Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Stats */}
              <div className="text-muted-foreground flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-1">
                  <Download className="h-4 w-4" />
                  <span>{document.downloadCount} lượt tải</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{document.viewCount} lượt xem</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4" />
                  <span>
                    {document.averageRating.toFixed(1)} ({document.totalRatings}{' '}
                    đánh giá)
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{formatDate(document.createdAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <DocumentPermissionGate document={document} action="download">
                  <Button
                    onClick={onDownload}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Tải xuống
                  </Button>
                </DocumentPermissionGate>

                <Button
                  variant={isBookmarked ? 'default' : 'outline'}
                  onClick={onBookmark}
                  disabled={isBookmarking}
                  className={
                    isBookmarked ? 'bg-primary text-primary-foreground' : ''
                  }
                  aria-busy={isBookmarking}
                  aria-pressed={isBookmarked}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="h-4 w-4" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {isBookmarked ? 'Xóa khỏi đánh dấu' : 'Thêm vào đánh dấu'}
                  </span>
                </Button>

                <DocumentPermissionGate document={document} action="share">
                  <Button variant="outline" onClick={onShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </DocumentPermissionGate>
              </div>
            </div>

            {/* Rating Section */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Đánh giá tài liệu này:</p>
              <RatingStars
                rating={userRating}
                averageRating={document.averageRating || 0}
                totalRatings={document.totalRatings || 0}
                onRatingChange={onRate}
                showAverage={false}
                size="lg"
                loading={isRatingLoading}
              />
            </div>

            {/* Tags and Category */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Danh mục:</span>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <span>{document.category.icon}</span>
                  {document.category.name}
                </Badge>
              </div>
              {document.tags.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Thẻ:</span>
                  <div className="flex flex-wrap gap-1">
                    {document.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
