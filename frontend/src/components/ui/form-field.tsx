import React from 'react';

import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface FormFieldProps extends React.ComponentProps<'input'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || `field-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className={error ? 'text-destructive' : ''}>
            {label}
          </Label>
        )}
        <Input
          id={inputId}
          ref={ref}
          className={cn(error && 'border-destructive focus-visible:ring-destructive/20', className)}
          aria-invalid={!!error}
          {...props}
        />
        {(error || helperText) && (
          <p className={cn('text-sm', error ? 'text-destructive' : 'text-muted-foreground')}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
