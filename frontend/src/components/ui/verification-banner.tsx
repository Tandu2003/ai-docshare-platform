import { useState } from 'react';

import { CheckCircle, Mail, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface VerificationBannerProps {
  email?: string;
  onResend?: () => void;
  onDismiss?: () => void;
  isVisible?: boolean;
}

export function VerificationBanner({
  email,
  onResend,
  onDismiss,
  isVisible = true,
}: VerificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isVisible || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Verify your email address
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            We sent a verification email to{' '}
            <span className="font-medium">{email || 'your email address'}</span>
            . Please check your inbox and follow the instructions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onResend && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResend}
              className="h-8 border-amber-200 text-xs text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
            >
              Resend
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface EmailVerifiedBannerProps {
  onDismiss?: () => void;
  isVisible?: boolean;
}

export function EmailVerifiedBanner({
  onDismiss,
  isVisible = true,
}: EmailVerifiedBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isVisible || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Email verified successfully!
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Your account is now fully activated.
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8 w-8 p-0 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
