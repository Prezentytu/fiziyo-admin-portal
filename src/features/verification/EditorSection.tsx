import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EditorSectionProps {
  index: number;
  title: string;
  icon: LucideIcon;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function EditorSection({
  index,
  title,
  icon: Icon,
  description,
  children,
  className,
}: Readonly<EditorSectionProps>) {
  return (
    <section className={cn('rounded-lg border border-border/60 bg-card/40 p-4', className)}>
      <header className="mb-3 flex items-start gap-2.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
          {index}
        </div>
        <div className="min-w-0 flex items-start gap-2">
          <div className="rounded-md border border-border/70 bg-background/60 p-1.5 text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
      </header>

      {children}
    </section>
  );
}
