import { Bookmark, BookmarkMinus, Calendar, Download, Eye, Search, Star } from 'lucide-react';
import { toast } from 'sonner';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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
  type BookmarkWithDocument,
  deleteBookmark,
  getUserBookmarks,
} from '@/services/bookmark.service';
import { getLanguageName } from '@/utils/language';

export default function BookmarksPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'rating' | 'downloads'>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<BookmarkWithDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUserBookmarks();
      setBookmarks(data);
    } catch (err) {
      console.error('Failed to load bookmarks', err);
      setError(err instanceof Error ? err.message : 'Failed to load bookmarks');
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
    return () => window.removeEventListener(BOOKMARKS_UPDATED_EVENT, handleUpdated);
  }, [loadBookmarks]);

  const handleRemove = async (bookmarkId: string) => {
    try {
      setIsRemovingId(bookmarkId);
      await deleteBookmark(bookmarkId);
      setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== bookmarkId));
      toast.success('Đã xóa bookmark');
    } catch (err) {
      console.error('Failed to delete bookmark', err);
      toast.error(err instanceof Error ? err.message : 'Không thể xóa bookmark');
    } finally {
      setIsRemovingId(null);
    }
  };

  const filteredBookmarks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return bookmarks.filter((bookmark) => {
      if (!query) {
        return true;
      }

      const { document } = bookmark;

      return (
        document.title.toLowerCase().includes(query) ||
        document.description?.toLowerCase().includes(query) ||
        document.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [bookmarks, searchQuery]);

  const sortedBookmarks = useMemo(() => {
    return [...filteredBookmarks].sort((a, b) => {
      const docA = a.document;
      const docB = b.document;

      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bookmark className="h-8 w-8 text-primary" />
            My Bookmarks
          </h1>
          <p className="text-muted-foreground mt-1">Your saved documents and resources</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {bookmarks.length} bookmarks
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Bookmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by title, description, or tags..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full"
              />
            </div>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Bookmarked</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="downloads">Most Downloaded</SelectItem>
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
            <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {searchQuery ? 'No bookmarks found' : 'No bookmarks yet'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {searchQuery
                ? 'Try adjusting your search terms or browse documents to bookmark them.'
                : 'Start bookmarking documents you find useful. Click the bookmark icon on any document to save it here.'}
            </p>
            {!searchQuery && (
              <Button asChild className="mt-4">
                <Link to="/documents">Browse Documents</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedBookmarks.map((bookmark) => {
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
              <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          to={`/documents/${document.id}`}
                          className="text-lg font-semibold hover:text-primary transition-colors"
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
                            Private
                          </Badge>
                        )}
                      </div>

                      {document.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {document.description}
                        </p>
                      )}

                      {/* Author and Stats */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">{uploaderInitials}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground">{uploaderName}</span>
                        </div>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          <span className="mr-1">{categoryIcon}</span>
                          {document.category.name}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getLanguageName(document.language)}
                        </Badge>
                        {tags.slice(0, 3).map((tag) => (
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
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Bookmarked on {new Date(bookmark.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/documents/${document.id}`}>View Document</Link>
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
                        <span className="sr-only">Remove bookmark</span>
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
