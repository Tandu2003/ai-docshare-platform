import { BookOpen, Brain, Search, Upload, Users } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <BookOpen className="h-20 w-20 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">DocShare AI</h1>
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            Platform chia sẻ tài liệu thông minh với AI, kết nối cộng đồng học tập và nghiên cứu
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth/register')}>
              Bắt đầu miễn phí
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/auth/login')}>
              Đăng nhập
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Upload className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Chia sẻ dễ dàng</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload và chia sẻ tài liệu một cách nhanh chóng và đơn giản
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Brain className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>AI thông minh</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Phân tích và tóm tắt tài liệu tự động với công nghệ AI tiên tiến
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Search className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Tìm kiếm nâng cao</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Tìm kiếm tài liệu chính xác với các bộ lọc và từ khóa thông minh
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center border-border hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Cộng đồng</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Kết nối với cộng đồng học tập và nghiên cứu toàn cầu
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations Section */}
        <Card className="mb-16 border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl mb-4">AI Recommendations</CardTitle>
            <CardDescription className="text-base">
              Khám phá những tài liệu phù hợp với sở thích và nhu cầu của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-muted/50 rounded-lg border border-border">
                <h3 className="font-semibold text-base mb-2 text-foreground">Tài liệu phổ biến</h3>
                <p className="text-sm text-muted-foreground">
                  Những tài liệu được đánh giá cao nhất
                </p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-lg border border-border">
                <h3 className="font-semibold text-base mb-2 text-foreground">Gợi ý cá nhân</h3>
                <p className="text-sm text-muted-foreground">Dựa trên lịch sử tìm kiếm của bạn</p>
              </div>
              <div className="text-center p-6 bg-muted/50 rounded-lg border border-border">
                <h3 className="font-semibold text-base mb-2 text-foreground">Xu hướng mới</h3>
                <p className="text-sm text-muted-foreground">Những tài liệu mới nhất và hot nhất</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Sẵn sàng khám phá?</h2>
          <p className="text-base text-muted-foreground mb-8">
            Tham gia cộng đồng DocShare AI ngay hôm nay
          </p>
          <Button size="lg" onClick={() => navigate('/auth/register')}>
            Tạo tài khoản miễn phí
          </Button>
        </div>
      </div>
    </div>
  );
}
