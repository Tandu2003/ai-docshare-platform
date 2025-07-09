import {
  Award,
  BarChart3,
  BookOpen,
  Brain,
  Download,
  Eye,
  Globe,
  MessageSquare,
  Search,
  Shield,
  Star,
  Target,
  Upload,
  Users,
  Zap,
} from 'lucide-react';

import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Progress } from './components/ui/progress';
import { Separator } from './components/ui/separator';

function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">DocShare AI</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a
              href="#features"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Tính năng
            </a>
            <a
              href="#community"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Cộng đồng
            </a>
            <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">
              Giới thiệu
            </a>
            <Button variant="outline" size="sm">
              Đăng nhập
            </Button>
            <Button size="sm">Đăng ký</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge variant="secondary" className="mb-4">
            <Brain className="w-4 h-4 mr-2" />
            Powered by AI
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-tight">
            Chia sẻ tài liệu học tập thông minh
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Nền tảng chia sẻ tài liệu học tập ứng dụng AI giúp sinh viên tìm kiếm, đánh giá và sử
            dụng tài liệu một cách hiệu quả nhất.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Tìm kiếm tài liệu, môn học, tác giả..."
                className="pl-10 h-12 text-lg"
              />
              <Button className="absolute right-2 top-1/2 transform -translate-y-1/2">
                Tìm kiếm
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2">
              <Upload className="w-5 h-5" />
              Chia sẻ tài liệu
            </Button>
            <Button variant="outline" size="lg" className="gap-2">
              <Users className="w-5 h-5" />
              Tham gia cộng đồng
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
              <div className="text-sm text-muted-foreground">Tài liệu chia sẻ</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">5,000+</div>
              <div className="text-sm text-muted-foreground">Sinh viên tham gia</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">50+</div>
              <div className="text-sm text-muted-foreground">Trường đại học</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground">Độ chính xác AI</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Tính năng nổi bật</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Khám phá những tính năng AI tiên tiến giúp việc học tập trở nên hiệu quả hơn
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Tóm tắt thông minh</CardTitle>
                <CardDescription>
                  AI tự động tóm tắt nội dung tài liệu, giúp bạn nắm bắt ý chính nhanh chóng
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Search className="w-6 h-6 text-secondary-foreground" />
                </div>
                <CardTitle>Tìm kiếm nâng cao</CardTitle>
                <CardDescription>
                  Tìm kiếm theo nội dung, môn học, tác giả với độ chính xác cao
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle>Gợi ý liên quan</CardTitle>
                <CardDescription>
                  AI đề xuất tài liệu liên quan dựa trên lịch sử tìm kiếm của bạn
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Bảo mật cao</CardTitle>
                <CardDescription>
                  Hệ thống phân quyền truy cập và mã hóa dữ liệu đảm bảo an toàn
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-secondary-foreground" />
                </div>
                <CardTitle>Đánh giá & Bình luận</CardTitle>
                <CardDescription>
                  Hệ thống đánh giá và bình luận giúp cộng đồng chia sẻ kinh nghiệm
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-accent-foreground" />
                </div>
                <CardTitle>Thống kê chi tiết</CardTitle>
                <CardDescription>
                  Báo cáo thống kê về tài liệu, lượt tải, đánh giá và xu hướng
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Cách thức hoạt động</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Chỉ với 3 bước đơn giản, bạn có thể bắt đầu chia sẻ và tìm kiếm tài liệu
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Đăng ký & Tạo tài khoản</h3>
              <p className="text-muted-foreground">
                Tạo tài khoản miễn phí với email sinh viên của bạn
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Upload & Chia sẻ</h3>
              <p className="text-muted-foreground">
                Upload tài liệu học tập và chia sẻ với cộng đồng
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary-foreground">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4">Tìm kiếm & Sử dụng</h3>
              <p className="text-muted-foreground">Tìm kiếm tài liệu cần thiết và tải về sử dụng</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Documents */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Tài liệu mới nhất</h2>
              <p className="text-muted-foreground">Khám phá những tài liệu mới được chia sẻ</p>
            </div>
            <Button variant="outline">Xem tất cả</Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Giáo trình Toán cao cấp A1',
                author: 'Nguyễn Văn A',
                university: 'ĐH Bách Khoa Hà Nội',
                downloads: 245,
                rating: 4.8,
                type: 'PDF',
              },
              {
                title: 'Bài tập Vật lý đại cương',
                author: 'Trần Thị B',
                university: 'ĐH Khoa học Tự nhiên',
                downloads: 189,
                rating: 4.6,
                type: 'DOCX',
              },
              {
                title: 'Slide bài giảng Lập trình Web',
                author: 'Lê Văn C',
                university: 'ĐH Công nghệ',
                downloads: 312,
                rating: 4.9,
                type: 'PPTX',
              },
            ].map((doc, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{doc.type}</Badge>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{doc.rating}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{doc.title}</CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback>
                          {doc.author
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{doc.author}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{doc.university}</div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Download className="w-4 h-4" />
                        {doc.downloads}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {Math.floor(doc.downloads * 1.5)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Tải về
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section id="community" className="py-20 bg-muted/30 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Cộng đồng sinh viên</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Tham gia cộng đồng để chia sẻ kinh nghiệm và học hỏi từ bạn bè
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-6">Tại sao tham gia cộng đồng?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Users className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Kết nối với sinh viên toàn quốc</h4>
                    <p className="text-muted-foreground">
                      Giao lưu, học hỏi từ sinh viên các trường đại học khác nhau
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageSquare className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Thảo luận và chia sẻ kinh nghiệm</h4>
                    <p className="text-muted-foreground">
                      Tham gia thảo luận về các môn học và phương pháp học tập
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Award className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Nhận điểm thưởng và danh hiệu</h4>
                    <p className="text-muted-foreground">
                      Tích lũy điểm thưởng khi chia sẻ tài liệu chất lượng
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Thống kê cộng đồng</CardTitle>
                <CardDescription>Những con số ấn tượng về cộng đồng của chúng ta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tài liệu được chia sẻ</span>
                    <span className="text-sm text-muted-foreground">75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Tương tác cộng đồng</span>
                    <span className="text-sm text-muted-foreground">90%</span>
                  </div>
                  <Progress value={90} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Đánh giá tích cực</span>
                    <span className="text-sm text-muted-foreground">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Sẵn sàng bắt đầu hành trình học tập thông minh?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Tham gia ngay hôm nay để trải nghiệm nền tảng chia sẻ tài liệu AI tiên tiến nhất
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gap-2">
                <Zap className="w-5 h-5" />
                Đăng ký miễn phí
              </Button>
              <Button variant="outline" size="lg" className="gap-2">
                <Globe className="w-5 h-5" />
                Khám phá demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">DocShare AI</span>
              </div>
              <p className="text-muted-foreground mb-4">
                Nền tảng chia sẻ tài liệu học tập thông minh ứng dụng AI cho sinh viên Việt Nam.
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="sm">
                  <Globe className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Tính năng</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Tìm kiếm AI
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Tóm tắt thông minh
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Gợi ý liên quan
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Đánh giá tài liệu
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Cộng đồng</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Diễn đàn
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Nhóm học tập
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Sự kiện
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Hỗ trợ</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Trung tâm trợ giúp
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Liên hệ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Bảo mật
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Điều khoản
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} DocShare AI. Tất cả quyền được bảo lưu.</p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <span>Được phát triển với ❤️ cho sinh viên IUH</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
