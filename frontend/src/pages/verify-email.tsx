import { useEffect, useRef, useState } from 'react';

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

type VerificationStatus = 'loading' | 'success' | 'error';
export function VerifyEmailPage() {
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isVerifying = useRef(false);

  const token = searchParams.get('token');

  useEffect(() => {
    // Prevent duplicate API calls
    if (isVerifying.current) return;

    const verifyEmail = async () => {
      if (!token) {
        setError('Token xác thực không hợp lệ');
        setStatus('error');
        return;
      }

      isVerifying.current = true;
      setStatus('loading');
      setError(null);

      try {
        const result = await authService.verifyEmail({ token });

        // Only update success state after API call completes successfully
        setStatus('success');
        toast.success(result.message);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err: any) {
        // Only set error after API call fails
        setError(err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn');
        setStatus('error');
        toast.error(err.message || 'Xác thực email thất bại');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendVerification = async () => {
    // You might want to implement a way to get the email for resending
    // For now, redirect to resend verification page
    navigate('/resend-verification');
  };

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              DocShare Platform
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

  // Show success state
  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              DocShare Platform
            </h1>
            <p className="text-gray-600">Xác thực email thành công</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">
                Email đã được xác thực thành công
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

  // Show error state
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            DocShare Platform
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
