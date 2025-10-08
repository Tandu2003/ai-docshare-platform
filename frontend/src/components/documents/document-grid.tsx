import { Calendar, Crown, Download, Eye, FileText, Lock, Star } from 'lucide-react';

import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Document } from '@/services/files.service';
import { getLanguageName } from '@/utils/language';

interface DocumentGridProps {
  documents: Document[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function DocumentGrid({ documents, isLoading, onLoadMore, hasMore }: DocumentGridProps) {
  if (isLoading && documents.length === 0) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent className="animate-pulse space-y-3">
              <Skeleton className="h-20 w-full" />
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No documents found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search criteria or filters to find more documents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {documents.map((document) => (
          <Card key={document.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/documents/${document.id}`}
                    className="text-lg font-semibold hover:text-primary transition-colors line-clamp-2"
                  >
                    {document.title}
                  </Link>
                  {document.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {document.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  {document.isPremium && <Crown className="h-4 w-4 text-yellow-500" />}
                  {!document.isPublic && <Lock className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Author */}
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {document.uploader?.firstName?.charAt(0) || 'U'}
                    {document.uploader?.lastName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {document.uploader?.firstName || 'Unknown'}{' '}
                  {document.uploader?.lastName || 'User'}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Download className="h-3 w-3" />
                    <span>{document.downloadCount}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3" />
                    <span>{document.viewCount}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>{document.averageRating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Category and Tags */}
              <div className="space-y-2">
                <Badge variant="secondary" className="text-xs">
                  <span className="mr-1">{document.category?.icon || '📄'}</span>
                  {document.category?.name || 'Uncategorized'}
                </Badge>
                {document.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {document.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {document.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{document.tags.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/documents/${document.id}`}>View Details</Link>
                </Button>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{getLanguageName(document.language)}</span>
                  {document.isApproved ? (
                    <Badge variant="default" className="text-xs">
                      Approved
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-6">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
