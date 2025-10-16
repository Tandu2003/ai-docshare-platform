import React, { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { FormFieldPassword } from '@/components/ui/form-field-password';
import { useAuth } from '@/hooks';
import { registerSchema, type RegisterFormData } from '@/schemas';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      const result = await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
      });

      if (result.meta.requestStatus === 'fulfilled') {
        reset();
        onSuccess?.();
        navigate('/dashboard');
      }
    } catch (err) {
      // Error is handled by Redux and toast
      console.error('Registration failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Tạo tài khoản</CardTitle>
        <CardDescription>
          Đăng ký để bắt đầu sử dụng nền tảng của chúng tôi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Tên"
              type="text"
              placeholder="Nguyễn"
              {...register('firstName')}
              error={errors.firstName?.message}
              disabled={isSubmitting}
            />

            <FormField
              label="Họ"
              type="text"
              placeholder="Văn"
              {...register('lastName')}
              error={errors.lastName?.message}
              disabled={isSubmitting}
            />
          </div>

          <FormField
            label="Email"
            type="email"
            placeholder="nguyen.van@example.com"
            {...register('email')}
            error={errors.email?.message}
            disabled={isSubmitting}
          />

          <FormField
            label="Tên đăng nhập"
            type="text"
            placeholder="nguyenvan"
            {...register('username')}
            error={errors.username?.message}
            disabled={isSubmitting}
          />

          <FormFieldPassword
            label="Mật khẩu"
            placeholder="Nhập mật khẩu của bạn"
            {...register('password')}
            error={errors.password?.message}
            disabled={isSubmitting}
          />

          <FormFieldPassword
            label="Xác nhận mật khẩu"
            placeholder="Xác nhận mật khẩu của bạn"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            disabled={isSubmitting}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </Button>

          {onSwitchToLogin && (
            <div className="space-y-2 text-center text-sm">
              <div>
                <span className="text-muted-foreground">Đã có tài khoản? </span>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={onSwitchToLogin}
                  disabled={isSubmitting}
                >
                  Đăng nhập
                </Button>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Không nhận được email xác thực?{' '}
                </span>
                <Link
                  to="/auth/resend-verification"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  Gửi lại
                </Link>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
