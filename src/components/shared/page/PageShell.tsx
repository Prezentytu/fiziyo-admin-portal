import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'fullBleed' | 'split';
}

export function PageShell({ children, className, variant = 'default' }: PageShellProps) {
  if (variant === 'fullBleed') {
    return (
      <div
        className={cn(
          '-m-4 lg:-m-6 2xl:-m-8 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] 2xl:h-[calc(100%+4rem)]',
          className
        )}
      >
        {children}
      </div>
    );
  }

  if (variant === 'split') {
    return <div className={cn('flex min-h-full gap-6', className)}>{children}</div>;
  }

  return <div className={cn('mx-auto max-w-screen-2xl space-y-6', className)}>{children}</div>;
}
