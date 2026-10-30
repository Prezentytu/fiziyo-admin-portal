import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ChatCardProps {
  readonly title?: string;
  readonly meta?: ReactNode;
  readonly badge?: ReactNode;
  readonly children?: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
  readonly testId: string;
}

/** One answer = one card with at most one primary action (AI view catalog rule). */
export function ChatCard({ title, meta, badge, children, footer, className, testId }: ChatCardProps) {
  return (
    <section
      data-testid={testId}
      className={cn('flex flex-col gap-3 rounded-[18px] border border-separator bg-card px-[18px] py-4', className)}
    >
      {(title || badge) && (
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-[16px] font-semibold leading-[22px] text-foreground">{title}</h3>}
            {meta && (
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-label-secondary">{meta}</div>
            )}
          </div>
          {badge}
        </header>
      )}
      {children}
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-[0.5px] border-separator pt-3">
          {footer}
        </div>
      )}
    </section>
  );
}

export function ChatCardNote({ children }: { readonly children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-[13px] leading-[18px] text-label-tertiary">
      <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function ChatCardEmpty({ children, testId }: { readonly children: ReactNode; readonly testId: string }) {
  return (
    <p data-testid={testId} className="rounded-[14px] bg-fill-quaternary px-4 py-3 text-[14px] text-label-secondary">
      {children}
    </p>
  );
}
