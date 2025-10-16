import { useState } from 'react';

import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Download,
  Eye,
  Share2,
  Star,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
}: DocumentDetailHeaderProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleRatingClick = (rating: number) => {
    onRate(rating);
  };

  const handleRatingHover = (rating: number) => {
    setHoveredRating(rating);
  };

  const handleRatingLeave = () => {
    setHoveredRating(0);
  };

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
                <Button
                  onClick={onDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Tải xuống
                </Button>
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
                <Button variant="outline" onClick={onShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Rating Section */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Đánh giá tài liệu này:</p>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map(rating => (
                  <TooltipProvider key={rating}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleRatingClick(rating)}
                          onMouseEnter={() => handleRatingHover(rating)}
                          onMouseLeave={handleRatingLeave}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-6 w-6 transition-colors ${
                              rating <= (hoveredRating || userRating)
                                ? 'fill-current text-yellow-400'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {rating} sao{rating > 1 ? 's' : ''}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                {userRating > 0 && (
                  <span className="text-muted-foreground ml-2 text-sm">
                    Bạn đã đánh giá {userRating} sao{userRating > 1 ? 's' : ''}
                  </span>
                )}
              </div>
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
