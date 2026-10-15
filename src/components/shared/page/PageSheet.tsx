import { cn } from '@/lib/utils';

interface PageSheetProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly 'data-testid'?: string;
}

/** White sheet on the grouped background (DS v4 page container). */
export function PageSheet({ children, className, contentClassName, ...props }: PageSheetProps) {
  return (
    <div
      className={cn('min-h-full rounded-card bg-card px-4 py-6 sm:px-8 sm:py-8 xl:px-11 xl:py-9', className)}
      data-testid={props['data-testid']}
    >
      <div className={cn('mx-auto flex w-full max-w-[1160px] flex-col gap-8', contentClassName)}>{children}</div>
    </div>
  );
}
