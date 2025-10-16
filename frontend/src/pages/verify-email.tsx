import { useEffect, useState } from 'react';

import { CheckCircle, Loader2, Mail, XCircle } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { authService } from '@/utils';

export function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Token xác thực không hợp lệ');
        setHasCompleted(true);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null); // Clear any previous errors
        setIsSuccess(false); // Clear any previous success state
        setHasCompleted(false); // Reset completion state

        const result = await authService.verifyEmail({ token });

        // Only update success state after API call completes successfully
        setIsSuccess(true);
        setHasCompleted(true);
        toast.success(result.message);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error: any) {
        console.error('Verify email error:', error);
        // Only set error after API call fails
        setError(error.message || 'Xác thực email thất bại');
        setHasCompleted(true);
        toast.error(error.message || 'Xác thực email thất bại');
      } finally {
        // Always set loading to false after API call completes (success or error)
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendVerification = async () => {
    // You might want to implement a way to get the email for resending
    // For now, redirect to resend verification page
    navigate('/resend-verification');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              AI DocShare Platform
            </h1>
            <p className="text-gray-600">Đang xác thực email của bạn</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Đang xác thực email...</CardTitle>
              <CardDescription>
                Vui lòng đợi trong khi chúng tôi xác thực địa chỉ email của bạn.
                <br />
                <span className="text-sm text-gray-500">
                  Quá trình này có thể mất vài giây.
                </span>
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (hasCompleted && isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              AI DocShare Platform
            </h1>
            <p className="text-gray-600">Xác thực email thành công</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">
                Email đã được xác thực!
              </CardTitle>
              <CardDescription>
                Tài khoản của bạn đã được kích hoạt thành công. Bạn sẽ được
                chuyển hướng đến trang đăng nhập trong giây lát.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/login">Đăng nhập ngay</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (hasCompleted && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              AI DocShare Platform
            </h1>
            <p className="text-gray-600">Xác thực thất bại</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl">Xác thực thất bại</CardTitle>
              <CardDescription className="text-red-600 dark:text-red-400">
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleResendVerification} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Gửi lại email xác thực
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Quay lại đăng nhập</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback state - should not reach here in normal flow
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            AI DocShare Platform
          </h1>
          <p className="text-gray-600">Đang xử lý yêu cầu của bạn</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-400" />
            </div>
            <CardTitle className="text-2xl">Đang xử lý...</CardTitle>
            <CardDescription>
              Vui lòng đợi trong khi chúng tôi xử lý yêu cầu của bạn.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
