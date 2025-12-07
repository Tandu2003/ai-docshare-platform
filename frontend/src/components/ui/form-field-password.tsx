import { forwardRef, type ComponentProps } from 'react';

import { InputPassword } from '@/components/ui/input-password';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldPasswordProps extends ComponentProps<typeof InputPassword> {
  label?: string;
  error?: string;
  helperText?: string;
}
export const FormFieldPassword = forwardRef<
  HTMLInputElement,
  FormFieldPasswordProps
>(({ label, error, helperText, className, id, ...props }, ref) => {
  const inputId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={inputId} className={error ? 'text-destructive' : ''}>
          {label}
        </Label>
      )}
      <InputPassword
        id={inputId}
        ref={ref}
        className={cn(
          error && 'border-destructive focus-visible:ring-destructive/20',
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
      {(error || helperText) && (
        <p
          className={cn(
            'text-sm',
            error ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
});

FormFieldPassword.displayName = 'FormFieldPassword';
