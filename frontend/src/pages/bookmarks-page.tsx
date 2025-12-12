import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from 'react';

import {
  Bookmark,
  BookmarkMinus,
  Calendar,
  Download,
  Eye,
  Search,
  Star,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BOOKMARKS_UPDATED_EVENT,
  deleteBookmark,
  getUserBookmarks,
  type BookmarkWithDocument,
} from '@/services/bookmark.service';
import { formatDate } from '@/utils/date';
import { getLanguageName } from '@/utils/language';

export function BookmarksPage(): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get initial values from URL
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('q') || '',
  );
  const [sortBy, setSortBy] = useState<
    'recent' | 'title' | 'rating' | 'downloads'
  >(() => (searchParams.get('sortBy') as any) || 'recent');
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<BookmarkWithDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);

  // Update URL when filters change
  const updateUrlParams = useCallback(
    (query: string, sort: string) => {
      const newParams = new URLSearchParams();
      if (query) newParams.set('q', query);
      if (sort !== 'recent') newParams.set('sortBy', sort);
      setSearchParams(newParams);
    },
    [setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      updateUrlParams(value, sortBy);
    },
    [sortBy, updateUrlParams],
  );

  const handleSortChange = useCallback(
    (value: typeof sortBy) => {
      setSortBy(value);
      updateUrlParams(searchQuery, value);
    },
    [searchQuery, updateUrlParams],
  );

  // Sync state from URL on mount
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const sort = (searchParams.get('sortBy') as typeof sortBy) || 'recent';
    setSearchQuery(q);
    setSortBy(sort);
  }, [searchParams]);

  const loadBookmarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUserBookmarks();
      setBookmarks(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải danh sách đánh dấu',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    const handleUpdated = () => {
      void loadBookmarks();
    };

    window.addEventListener(BOOKMARKS_UPDATED_EVENT, handleUpdated);
    return () =>
      window.removeEventListener(BOOKMARKS_UPDATED_EVENT, handleUpdated);
  }, [loadBookmarks]);

  const handleRemove = async (bookmarkId: string) => {
    try {
      setIsRemovingId(bookmarkId);
      await deleteBookmark(bookmarkId);
      setBookmarks(prev => prev.filter(bookmark => bookmark.id !== bookmarkId));
      toast.success('Đã xóa bookmark');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể xóa bookmark',
      );
    } finally {
      setIsRemovingId(null);
    }
  };

  const filteredBookmarks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return bookmarks.filter(bookmark => {
      if (!query) {
        return true;
      }

      const { document } = bookmark;

      return (
        document.title.toLowerCase().includes(query) ||
        document.description?.toLowerCase().includes(query) ||
        document.tags.some(tag => tag.toLowerCase().includes(query))
      );
    });
  }, [bookmarks, searchQuery]);

  const sortedBookmarks = useMemo(() => {
    return [...filteredBookmarks].sort((a, b) => {
      const docA = a.document;
      const docB = b.document;

      switch (sortBy) {
        case 'recent':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'title':
          return docA.title.localeCompare(docB.title);
        case 'rating':
          return docB.averageRating - docA.averageRating;
        case 'downloads':
          return docB.downloadCount - docA.downloadCount;
        default:
          return 0;
      }
    });
  }, [filteredBookmarks, sortBy]);

  return (
    <div className="mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Bookmark className="text-primary h-8 w-8" />
            Đánh dấu của tôi
          </h1>
          <p className="text-muted-foreground mt-1">
            Các tài liệu và tài nguyên đã lưu của bạn
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {bookmarks.length} đánh dấu
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Tìm kiếm đánh dấu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Tìm kiếm theo tiêu đề, mô tả hoặc thẻ..."
                value={searchQuery}
                onChange={event => handleSearchChange(event.target.value)}
                className="w-full"
              />
            </div>
            <Select
              value={sortBy}
              onValueChange={value => handleSortChange(value as typeof sortBy)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sắp xếp theo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Đánh dấu gần đây</SelectItem>
                <SelectItem value="title">Tiêu đề A-Z</SelectItem>
                <SelectItem value="rating">Đánh giá cao nhất</SelectItem>
                <SelectItem value="downloads">Tải nhiều nhất</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Bookmarks List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={`bookmark-skeleton-${index}`}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedBookmarks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bookmark className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-muted-foreground mb-2 text-lg font-medium">
              {searchQuery
                ? 'Không tìm thấy đánh dấu nào'
                : 'Chưa có đánh dấu nào'}
            </h3>
            <p className="text-muted-foreground max-w-md text-center text-sm">
              {searchQuery
                ? 'Hãy thử điều chỉnh từ khóa tìm kiếm hoặc duyệt tài liệu để đánh dấu chúng.'
                : 'Bắt đầu đánh dấu các tài liệu bạn thấy hữu ích. Nhấp vào biểu tượng đánh dấu trên bất kỳ tài liệu nào để lưu ở đây.'}
            </p>
            {!searchQuery && (
              <Button asChild className="mt-4">
                <Link to="/documents">Duyệt tài liệu</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedBookmarks.map(bookmark => {
            const document = bookmark.document;
            const ratingValue = Number(document.averageRating ?? 0).toFixed(1);
            const categoryIcon = document.category.icon ?? '📄';
            const tags = document.tags ?? [];
            const uploaderInitials =
              `${document.uploader.firstName?.charAt(0) ?? ''}${
                document.uploader.lastName?.charAt(0) ?? ''
              }`.trim() || document.uploader.username.charAt(0).toUpperCase();
            const uploaderName =
              `${document.uploader.firstName ?? ''} ${document.uploader.lastName ?? ''}`.trim() ||
              document.uploader.username;

            return (
              <Card
                key={bookmark.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Link
                          to={`/documents/${document.id}`}
                          className="hover:text-primary text-lg font-semibold transition-colors"
                        >
                          {document.title}
                        </Link>
                        {document.isPremium && (
                          <Badge variant="default" className="text-xs">
                            Premium
                          </Badge>
                        )}
                        {!document.isPublic && (
                          <Badge variant="secondary" className="text-xs">
                            Riêng tư
                          </Badge>
                        )}
                      </div>

                      {document.description && (
                        <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
                          {document.description}
                        </p>
                      )}

                      {/* Author and Stats */}
                      <div className="mb-3 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {uploaderInitials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-muted-foreground text-sm">
                            {uploaderName}
                          </span>
                        </div>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="text-muted-foreground flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            <span>{document.downloadCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span>{document.viewCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            <span>{ratingValue}</span>
                          </div>
                        </div>
                      </div>

                      {/* Category and Tags */}
                      <div className="mb-3 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <span className="mr-1">{categoryIcon}</span>
                          {document.category.name}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getLanguageName(document.language)}
                        </Badge>
                        {tags.slice(0, 3).map(tag => (
                          <Badge
                            key={`${bookmark.id}-${tag}`}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{tags.length - 3} more
                          </Badge>
                        )}
                      </div>

                      {/* Bookmarked Date */}
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Đã đánh dấu vào {formatDate(bookmark.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/documents/${document.id}`}>
                          Xem tài liệu
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(bookmark.id)}
                        disabled={isRemovingId === bookmark.id}
                        className="text-primary hover:text-primary focus-visible:text-primary"
                        aria-pressed={false}
                      >
                        <BookmarkMinus className="h-4 w-4" />
                        <span className="sr-only">Xóa đánh dấu</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
