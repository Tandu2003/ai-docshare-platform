import { zodResolver } from '@hookform/resolvers/zod';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks';
import { type LoginFormData, loginSchema } from '../../schemas';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { FormField } from '../ui/form-field';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login({
        emailOrUsername: data.emailOrUsername,
        password: data.password,
      });

      if (result.meta.requestStatus === 'fulfilled') {
        reset();
        onSuccess?.();
        navigate('/dashboard');
      }
    } catch (err) {
      // Error is handled by Redux and toast
      console.error('Login failed:', err);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Email or Username"
            type="text"
            placeholder="Enter your email or username"
            {...register('emailOrUsername')}
            error={errors.emailOrUsername?.message}
          />

          <FormField
            label="Password"
            type="password"
            placeholder="Enter your password"
            {...register('password')}
            error={errors.password?.message}
          />

          <Button type="submit" className="w-full" disabled={isLoading || isSubmitting}>
            {isLoading || isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>

          {onSwitchToRegister && (
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={onSwitchToRegister}
              >
                Sign up
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
