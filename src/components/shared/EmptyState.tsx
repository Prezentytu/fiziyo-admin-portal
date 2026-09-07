import { Loader2, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionLoading?: boolean;
  className?: string;
  density?: 'default' | 'compact' | 'inline';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionLoading = false,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionLoading = false,
  className,
  density = 'default',
}: EmptyStateProps) {
  const Title = density === 'inline' ? 'p' : 'h3';
  return (
    <div
      data-testid="common-empty-state"
      className={cn(
        'min-w-0 wrap-anywhere',
        density === 'compact'
          ? 'grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 py-4 text-left'
          : density === 'inline'
            ? 'space-y-2 py-2 text-left'
            : 'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      {density !== 'inline' && (
        <div className={density === 'compact' ? 'row-span-3 pt-0.5' : 'mb-4 rounded-full bg-surface-light p-4'}>
          <Icon
            className={cn('text-muted-foreground', density === 'compact' ? 'h-5 w-5' : 'h-8 w-8')}
            aria-hidden="true"
          />
        </div>
      )}
      <Title
        className={
          density === 'inline'
            ? 'text-sm text-muted-foreground'
            : cn('mb-1 font-semibold', density === 'compact' ? 'text-sm' : 'text-lg')
        }
      >
        {title}
      </Title>
      {description && (
        <p className={cn('max-w-sm text-sm text-muted-foreground', density === 'compact' ? 'mb-2' : 'mb-4')}>
          {description}
        </p>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div
          className={cn(
            'flex flex-wrap gap-2',
            density === 'compact'
              ? 'col-start-2 justify-start'
              : density === 'inline'
                ? 'justify-start'
                : 'flex-col sm:flex-row items-center'
          )}
        >
          {actionLabel && onAction && (
            <Button data-testid="common-empty-state-btn-43" onClick={onAction} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              data-testid="emptystate-button-49"
              variant="outline"
              onClick={onSecondaryAction}
              disabled={secondaryActionLoading}
            >
              {secondaryActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
