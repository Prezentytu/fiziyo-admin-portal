import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[88px] w-full rounded-control border border-transparent bg-input text-foreground px-3.5 py-3 text-[15px] leading-[22px] placeholder:text-label-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-status-danger disabled:cursor-not-allowed disabled:opacity-40',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
