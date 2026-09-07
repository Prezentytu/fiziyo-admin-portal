import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  titleTestId?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = 'Wróć',
  titleTestId = 'page-header-title',
  className,
}: PageHeaderProps) {
  return (
    <div
      data-testid="page-header"
      className={cn(
        'flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between',
        className
      )}
    >
      <div className="min-w-0 space-y-2 sm:flex-1 sm:basis-48">
        {backHref ? (
          <Button data-testid="page-header-back" variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        ) : null}
        <h1
          data-testid={titleTestId}
          className="text-2xl font-semibold leading-tight tracking-normal text-foreground [overflow-wrap:anywhere]"
        >
          {title}
        </h1>
        {description ? <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{description}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
