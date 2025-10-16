import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { InputPassword } from '@/components/ui/input-password';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/schemas';
import { authService } from '@/utils';

export function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Redirect if no token
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              AI DocShare Platform
            </h1>
            <p className="text-gray-600">Liên kết đặt lại không hợp lệ</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Token không hợp lệ</CardTitle>
              <CardDescription>
                Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/forgot-password">Yêu cầu đặt lại mật khẩu mới</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);
      const result = await authService.resetPassword({
        token,
        password: data.password,
      });

      toast.success(result.message);
      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              AI DocShare Platform
            </h1>
            <p className="text-gray-600">Đặt lại mật khẩu thành công</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">
                Đặt lại mật khẩu thành công!
              </CardTitle>
              <CardDescription>
                Mật khẩu của bạn đã được cập nhật thành công. Bạn sẽ được chuyển
                hướng đến trang đăng nhập trong giây lát.
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            AI DocShare Platform
          </h1>
          <p className="text-gray-600">Tạo mật khẩu mới</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mật khẩu mới</CardTitle>
            <CardDescription>
              Vui lòng chọn mật khẩu mạnh cho tài khoản của bạn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu mới</FormLabel>
                      <FormControl>
                        <InputPassword
                          placeholder="Nhập mật khẩu mới"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Xác nhận mật khẩu</FormLabel>
                      <FormControl>
                        <InputPassword
                          placeholder="Nhập lại mật khẩu mới"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Đặt lại mật khẩu'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">Nhớ mật khẩu? </span>
              <Link
                to="/login"
                className="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
              >
                Đăng nhập ngay
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
