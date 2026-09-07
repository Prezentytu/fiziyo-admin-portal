import { cn } from '@/lib/utils';

interface PageHeroProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
  className?: string;
}

export function PageHero({
  title,
  description,
  icon,
  onClick,
  disabled,
  testId = 'page-hero',
  className,
}: PageHeroProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-linear-to-br from-primary via-primary to-primary-dark p-5 text-left transition-all duration-200',
        'hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/80',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        'sm:col-span-1 lg:col-span-4',
        className
      )}
    >
      <div className="relative flex items-center gap-4">
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/20 shrink-0">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-primary-foreground">{title}</h3>
          {description ? <p className="text-sm text-primary-foreground/80">{description}</p> : null}
        </div>
      </div>
    </button>
  );
}
