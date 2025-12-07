import React, { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

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
import { loginSchema, type LoginFormData } from '@/schemas';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister,
}) => {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const result = await login({
        emailOrUsername: data.emailOrUsername,
        password: data.password,
      });

      if (
        result &&
        typeof result === 'object' &&
        'meta' in result &&
        result.meta &&
        typeof result.meta === 'object' &&
        'requestStatus' in result.meta &&
        result.meta.requestStatus === 'fulfilled'
      ) {
        reset();
        // onSuccess callback will handle navigation to callback URL
        onSuccess?.();
      }
    } catch {
      // Error is handled by Redux and toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Chào mừng quay trở lại</CardTitle>
        <CardDescription>
          Đăng nhập vào tài khoản của bạn để tiếp tục
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Email hoặc tên đăng nhập"
            type="text"
            placeholder="Nhập email hoặc tên đăng nhập của bạn"
            {...register('emailOrUsername')}
            error={errors.emailOrUsername?.message}
            disabled={isSubmitting}
          />

          <FormFieldPassword
            label="Mật khẩu"
            placeholder="Nhập mật khẩu của bạn"
            {...register('password')}
            error={errors.password?.message}
            disabled={isSubmitting}
          />

          <div className="flex justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-primary hover:text-primary/80 text-sm underline underline-offset-4"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>

          {onSwitchToRegister && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Chưa có tài khoản? </span>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={onSwitchToRegister}
                disabled={isSubmitting}
              >
                Đăng ký
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
