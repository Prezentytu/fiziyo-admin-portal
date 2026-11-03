import { cn } from '@/lib/utils';

interface NavCountBadgeProps {
  count: number;
  className?: string;
}

export function NavCountBadge({ count, className }: Readonly<NavCountBadgeProps>) {
  if (count <= 0) {
    return null;
  }

  const label = count > 99 ? '99+' : String(count);
  const isWide = label.length > 1;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'border border-status-warning/30 bg-status-warning-muted text-status-warning',
        'text-[10px] font-semibold tabular-nums leading-none',
        isWide ? 'h-5 min-w-5 px-1' : 'size-5',
        className
      )}
      aria-label={`${count} oczekujących`}
    >
      {label}
    </span>
  );
}
