import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Upload, 
  Bookmark, 
  Eye,
  Download,
  Star,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DashboardOverview } from '@/types';

interface UserDashboardProps {
  stats: DashboardOverview;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ stats }) => {
  const userDocuments = stats.recentDocuments || [];
  const userStats = {
    totalDocuments: userDocuments.length,
    publishedDocuments: userDocuments.filter(doc => doc.isApproved && !doc.isDraft).length,
    draftDocuments: userDocuments.filter(doc => doc.isDraft).length,
    pendingDocuments: userDocuments.filter(doc => !doc.isApproved && !doc.isDraft).length,
    totalViews: userDocuments.reduce((sum, doc) => sum + (doc.viewCount || 0), 0),
    totalDownloads: userDocuments.reduce((sum, doc) => sum + (doc.downloadCount || 0), 0),
    averageRating: userDocuments.length > 0 
      ? userDocuments.reduce((sum, doc) => sum + (doc.averageRating || 0), 0) / userDocuments.length 
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* User Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Hành động nhanh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/upload" className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Tải lên tài liệu</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/my-documents" className="flex flex-col items-center gap-2">
                <FileText className="h-6 w-6" />
                <span className="text-sm font-medium">Tài liệu của tôi</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/bookmarks" className="flex flex-col items-center gap-2">
                <Bookmark className="h-6 w-6" />
                <span className="text-sm font-medium">Đánh dấu</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/documents" className="flex flex-col items-center gap-2">
                <Eye className="h-6 w-6" />
                <span className="text-sm font-medium">Khám phá</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tài liệu của tôi</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.publishedDocuments} đã xuất bản
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt xem</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Từ tất cả tài liệu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt tải</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalDownloads}</div>
            <p className="text-xs text-muted-foreground">
              Từ tất cả tài liệu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đánh giá trung bình</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats.averageRating.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Từ {userDocuments.length} tài liệu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Document Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Trạng thái tài liệu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Đã xuất bản</span>
                <Badge variant="default">
                  {userStats.publishedDocuments}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Bản nháp</span>
                <Badge variant="outline">
                  {userStats.draftDocuments}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Chờ duyệt</span>
                <Badge variant="secondary">
                  {userStats.pendingDocuments}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Hoạt động gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userStats.pendingDocuments > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>{userStats.pendingDocuments} tài liệu đang chờ duyệt</span>
                </div>
              )}
              {userStats.draftDocuments > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>{userStats.draftDocuments} bản nháp chưa hoàn thành</span>
                </div>
              )}
              {userStats.publishedDocuments > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{userStats.publishedDocuments} tài liệu đã xuất bản</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Tài liệu gần đây của tôi</CardTitle>
        </CardHeader>
        <CardContent>
          {userDocuments.length > 0 ? (
            <div className="space-y-4">
              {userDocuments.slice(0, 5).map((document) => (
                <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{document.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {document.isDraft ? 'Bản nháp' : 
                       document.isApproved ? 'Đã xuất bản' : 'Chờ duyệt'} • 
                      {document.viewCount || 0} lượt xem • 
                      {document.downloadCount || 0} lượt tải
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      document.isDraft ? 'outline' : 
                      document.isApproved ? 'default' : 'secondary'
                    }>
                      {document.isDraft ? 'Bản nháp' : 
                       document.isApproved ? 'Đã xuất bản' : 'Chờ duyệt'}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/documents/${document.id}`}>Xem</Link>
                    </Button>
                  </div>
                </div>
              ))}
              {userDocuments.length > 5 && (
                <div className="text-center pt-4">
                  <Button asChild variant="outline">
                    <Link to="/my-documents">Xem tất cả tài liệu</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Chưa có tài liệu nào</h3>
              <p className="text-muted-foreground mb-4">
                Bắt đầu bằng cách tải lên tài liệu đầu tiên của bạn
              </p>
              <Button asChild>
                <Link to="/upload">Tải lên tài liệu</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};