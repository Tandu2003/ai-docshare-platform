import { CheckCircle, Loader2, Mail, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { authService } from '../utils';

export function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Invalid verification token');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await authService.verifyEmail({ token });

        toast.success(result.message);
        setIsSuccess(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (error: any) {
        console.error('Verify email error:', error);
        setError(error.message || 'Email verification failed');
        toast.error(error.message || 'Email verification failed');
      } finally {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI DocShare Platform</h1>
            <p className="text-gray-600">Verifying your email</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Verifying email...</CardTitle>
              <CardDescription>Please wait while we verify your email address.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI DocShare Platform</h1>
            <p className="text-gray-600">Email verified successfully</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Email verified!</CardTitle>
              <CardDescription>
                Your account has been successfully activated. You will be redirected to the login
                page shortly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/login">Sign In Now</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI DocShare Platform</h1>
            <p className="text-gray-600">Verification failed</p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl">Verification Failed</CardTitle>
              <CardDescription className="text-red-600 dark:text-red-400">{error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleResendVerification} className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Resend Verification Email
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to Login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
