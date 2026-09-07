import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PageHeroProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
  className?: string;
  variant?: 'hero' | 'toolbar';
}

export function PageHero({
  title,
  description,
  icon,
  onClick,
  disabled,
  testId = 'page-hero',
  className,
  variant = 'hero',
}: PageHeroProps) {
  if (variant === 'toolbar') {
    return (
      <Button
        data-testid={testId}
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={description}
        className={cn('min-h-11', className)}
      >
        {icon ? (
          <span className="shrink-0 [&_svg]:size-4" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 wrap-anywhere">{title}</span>
      </Button>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-20 w-full min-w-0 rounded-sm bg-primary p-4 text-left text-primary-foreground transition-colors duration-150',
        'enabled:hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'sm:col-span-1 lg:col-span-4',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon ? (
          <div className="flex size-8 shrink-0 items-center justify-center [&_svg]:size-5" aria-hidden="true">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]">
          <h3 className="text-base font-semibold leading-snug tracking-normal">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-snug">{description}</p> : null}
        </div>
      </div>
    </button>
  );
}
