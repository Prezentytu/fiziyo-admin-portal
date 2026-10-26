import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StageSectionProps {
  title: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  'data-testid'?: string;
}

/** Grey tile inside the verification sheet. Fields inside use the card colour so they stand out from the tile. */
export function StageSection({ title, hint, required, className, children, 'data-testid': testId }: StageSectionProps) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-card bg-grouped-tertiary p-4 [--input:var(--grouped-secondary)]',
        className
      )}
      data-testid={testId}
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[17px] font-semibold leading-[22px] text-foreground">{title}</h3>
          {required && <Badge variant="secondary">Wymagane</Badge>}
        </div>
        {hint && <p className="text-[13px] leading-[18px] text-label-secondary">{hint}</p>}
      </header>
      {children}
    </section>
  );
}
