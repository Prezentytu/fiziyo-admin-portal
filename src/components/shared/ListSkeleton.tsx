import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ListSkeletonProps {
  variant?: 'grid' | 'rows' | 'cards';
  count?: number;
  className?: string;
}

export function ListSkeleton({ variant = 'grid', count = 8, className }: ListSkeletonProps) {
  const items = Array.from({ length: count }, (_, index) => index);

  if (variant === 'rows') {
    return (
      <div className={cn('space-y-2', className)} data-testid="page-list-skeleton">
        {items.map((item) => (
          <Skeleton key={item} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === 'cards'
          ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
      data-testid="page-list-skeleton"
    >
      {items.map((item) => (
        <Skeleton key={item} className="h-48 w-full rounded-2xl" />
      ))}
    </div>
  );
}
