import { Lock, LogIn, UserPlus } from 'lucide-react';

import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RequireAuthProps {
  message?: string;
  requiredAction?: string;
}

export function RequireAuth({
  message = 'Bạn cần đăng nhập để truy cập tính năng này',
  requiredAction = 'truy cập trang này',
}: RequireAuthProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Lock className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Yêu cầu đăng nhập</CardTitle>
          <CardDescription className="text-base">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Để {requiredAction}, vui lòng đăng nhập hoặc tạo tài khoản mới.
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="flex-1">
              <Link to="/auth/login" className="flex items-center justify-center">
                <LogIn className="mr-2 h-4 w-4" />
                Đăng nhập
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link to="/auth/register" className="flex items-center justify-center">
                <UserPlus className="mr-2 h-4 w-4" />
                Đăng ký
              </Link>
            </Button>
          </div>

          <div className="text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Quay về trang chủ
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
