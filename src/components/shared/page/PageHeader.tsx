import { cn } from '@/lib/utils';

interface PageHeaderProps {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly className?: string;
  readonly titleTestId?: string;
}

/** Screen title (28px), muted subtitle and right-aligned actions. */
export function PageHeader({ title, subtitle, actions, className, titleTestId }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 data-testid={titleTestId} className="text-[28px] font-bold leading-[34px] tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && <p className="text-[15px] leading-5 text-label-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
