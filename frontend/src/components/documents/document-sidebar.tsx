import { useState } from 'react';

import {
  Calendar,
  ChevronDown,
  Download,
  Edit,
  Eye,
  FileText,
  Globe,
  MessageSquare,
  Star,
  Tag,
} from 'lucide-react';

import { RatingStars } from '@/components/documents/rating-stars';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import type { DocumentView } from '@/services/document.service';
import { formatDate } from '@/utils/date';
import { formatFileSize } from '@/utils/format';
import { getLanguageName } from '@/utils/language';

interface DocumentSidebarProps {
  document: DocumentView;
  userRating: number;
  onRate: (rating: number) => void;
  isRatingLoading: boolean;
  isOwner: boolean;
  onEdit?: () => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between p-0 hover:bg-transparent"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function DocumentSidebar({
  document,
  userRating,
  onRate,
  isRatingLoading,
  isOwner,
  onEdit,
}: DocumentSidebarProps) {
  const totalFileSize = document.files.reduce((acc, file) => {
    const size =
      typeof file.fileSize === 'string'
        ? parseInt(file.fileSize, 10)
        : file.fileSize;
    return acc + (isNaN(size) ? 0 : size);
  }, 0);

  return (
    <Card className="sticky top-20">
      <CardContent className="space-y-4 p-4">
        {/* Rating Section */}
        <CollapsibleSection
          title="Đánh giá"
          icon={<Star className="h-4 w-4" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                Điểm trung bình
              </span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">
                  {document.averageRating.toFixed(1)}
                </span>
                <span className="text-muted-foreground text-sm">
                  ({document.totalRatings})
                </span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <span className="text-sm">Đánh giá của bạn:</span>
              <RatingStars
                rating={userRating}
                onRatingChange={onRate}
                size="md"
                loading={isRatingLoading}
              />
            </div>
          </div>
        </CollapsibleSection>

        <Separator />

        {/* Document Info Section */}
        <CollapsibleSection
          title="Thông tin tài liệu"
          icon={<FileText className="h-4 w-4" />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            {/* Category */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Danh mục</span>
              <Badge variant="secondary" className="flex items-center gap-1">
                {document.category.icon && (
                  <span>{document.category.icon}</span>
                )}
                {document.category.name}
              </Badge>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Ngôn ngữ</span>
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span className="text-sm">
                  {document.language
                    ? getLanguageName(document.language)
                    : 'Không xác định'}
                </span>
              </div>
            </div>

            {/* File Size */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Kích thước</span>
              <span className="text-sm">{formatFileSize(totalFileSize)}</span>
            </div>

            {/* File Count */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Số file</span>
              <span className="text-sm">{document.files.length} file</span>
            </div>

            {/* Created Date */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Ngày tạo</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="text-sm">
                  {formatDate(document.createdAt)}
                </span>
              </div>
            </div>

            {/* Updated Date */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Cập nhật</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="text-sm">
                  {formatDate(document.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <Separator />

        {/* Statistics Section */}
        <CollapsibleSection
          title="Thống kê"
          icon={<Eye className="h-4 w-4" />}
          defaultOpen={true}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 flex flex-col items-center rounded-lg p-3">
              <Download className="text-muted-foreground mb-1 h-4 w-4" />
              <span className="text-lg font-semibold">
                {document.downloadCount}
              </span>
              <span className="text-muted-foreground text-xs">Lượt tải</span>
            </div>
            <div className="bg-muted/50 flex flex-col items-center rounded-lg p-3">
              <Eye className="text-muted-foreground mb-1 h-4 w-4" />
              <span className="text-lg font-semibold">
                {document.viewCount}
              </span>
              <span className="text-muted-foreground text-xs">Lượt xem</span>
            </div>
            <div className="bg-muted/50 flex flex-col items-center rounded-lg p-3">
              <Star className="text-muted-foreground mb-1 h-4 w-4" />
              <span className="text-lg font-semibold">
                {document.totalRatings}
              </span>
              <span className="text-muted-foreground text-xs">Đánh giá</span>
            </div>
            <div className="bg-muted/50 flex flex-col items-center rounded-lg p-3">
              <MessageSquare className="text-muted-foreground mb-1 h-4 w-4" />
              <span className="text-lg font-semibold">
                {document.stats?.commentsCount ?? 0}
              </span>
              <span className="text-muted-foreground text-xs">Bình luận</span>
            </div>
          </div>
        </CollapsibleSection>

        <Separator />

        {/* Tags Section */}
        <CollapsibleSection
          title="Thẻ"
          icon={<Tag className="h-4 w-4" />}
          defaultOpen={true}
        >
          {document.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {document.tags.map(tag => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="hover:bg-accent cursor-pointer transition-colors"
                  data-testid="document-tag"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Không có thẻ nào</p>
          )}
        </CollapsibleSection>

        {/* Owner Actions */}
        {isOwner && onEdit && (
          <>
            <Separator />
            <Button variant="outline" className="w-full" onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Chỉnh sửa tài liệu
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
