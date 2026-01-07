'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  optional?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, optional, className, ...props }, ref) => {
    return (
      <div className="mb-5">
        <div className="mb-2 flex items-center">
          <label className="text-sm font-semibold text-foreground">{label}</label>
        </div>
        <input
          ref={ref}
          className={cn(
            'h-12 w-full rounded-xl bg-surface-light px-4 text-base text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'transition-all duration-200',
            error && 'ring-2 ring-error',
            className
          )}
          {...props}
        />
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>
    );
  }
);

FormField.displayName = 'FormField';










