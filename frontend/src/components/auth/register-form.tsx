import { zodResolver } from '@hookform/resolvers/zod';

import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { useAuth } from '@/hooks';
import { type RegisterFormData, registerSchema } from '@/schemas';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegisterFormData) => {
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
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Sign up to get started with our platform</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="First Name"
              type="text"
              placeholder="John"
              {...register('firstName')}
              error={errors.firstName?.message}
            />

            <FormField
              label="Last Name"
              type="text"
              placeholder="Doe"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
          </div>

          <FormField
            label="Email"
            type="email"
            placeholder="john.doe@example.com"
            {...register('email')}
            error={errors.email?.message}
          />

          <FormField
            label="Username"
            type="text"
            placeholder="johndoe"
            {...register('username')}
            error={errors.username?.message}
          />

          <FormField
            label="Password"
            type="password"
            placeholder="Enter your password"
            {...register('password')}
            error={errors.password?.message}
          />

          <FormField
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />

          <Button type="submit" className="w-full" disabled={isLoading || isSubmitting}>
            {isLoading || isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>

          {onSwitchToLogin && (
            <div className="text-center text-sm space-y-2">
              <div>
                <span className="text-muted-foreground">Already have an account? </span>
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto"
                  onClick={onSwitchToLogin}
                >
                  Sign in
                </Button>
              </div>
              <div>
                <span className="text-muted-foreground">Didn't receive verification email? </span>
                <Link
                  to="/auth/resend-verification"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  Resend
                </Link>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
