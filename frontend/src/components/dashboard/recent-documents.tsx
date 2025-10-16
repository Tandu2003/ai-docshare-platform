import { Calendar, Download, Eye, Star, User } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardDocument } from '@/types';

interface RecentDocumentsProps {
  documents: DashboardDocument[];
}

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tài liệu gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Chưa có tài liệu nào.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tài liệu gần đây</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.slice(0, 5).map(document => (
            <div key={document.id} className="flex items-center space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {document.title.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <Link
                  to={`/documents/${document.id}`}
                  className="hover:text-primary text-sm font-medium transition-colors"
                >
                  {document.title}
                </Link>
                <div className="text-muted-foreground flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>
                      {[document.uploader.firstName, document.uploader.lastName]
                        .filter((name): name is string =>
                          Boolean(name && name.trim()),
                        )
                        .join(' ') ||
                        document.uploader.username ||
                        'Người dùng'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(document.createdAt).toLocaleDateString()}
                    </span>
                  </div>
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
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {document.category.name}
                  </Badge>
                  {document.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
