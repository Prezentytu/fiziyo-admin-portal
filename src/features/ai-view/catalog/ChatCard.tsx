'use client';

import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChatCardProps {
  readonly title?: string;
  /** Explanation behind an ⓘ next to the title, read on hover or tap instead of a note in the card. */
  readonly info?: string;
  readonly meta?: ReactNode;
  readonly badge?: ReactNode;
  readonly children?: ReactNode;
  readonly footer?: ReactNode;
  /** Long cards (a form): the footer stays at the bottom of the chat window while the card scrolls under it. */
  readonly stickyFooter?: boolean;
  readonly className?: string;
  readonly testId: string;
}

/** One answer = one card with at most one primary action (AI view catalog rule). */
export function ChatCard({
  title,
  info,
  meta,
  badge,
  children,
  footer,
  stickyFooter,
  className,
  testId,
}: ChatCardProps) {
  return (
    <section
      data-testid={testId}
      className={cn('flex flex-col gap-3 rounded-[18px] border border-separator bg-card px-[18px] py-4', className)}
    >
      {(title || badge) && (
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-1.5">
                <h3 className="text-[16px] font-semibold leading-[22px] text-foreground">{title}</h3>
                {info && <ChatCardInfo text={info} testId={`${testId}-info`} />}
              </div>
            )}
            {meta && (
              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-label-secondary">{meta}</div>
            )}
          </div>
          {badge}
        </header>
      )}
      {children}
      {footer && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 border-t-[0.5px] border-separator pt-3',
            stickyFooter &&
              'sticky bottom-0 z-10 -mx-[18px] -mb-4 rounded-b-[18px] bg-card/90 px-[18px] pb-4 backdrop-blur-md'
          )}
        >
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

/** ⓘ next to a card title: opens on hover, keyboard focus or tap (touch has no hover). */
export function ChatCardInfo({ text, testId }: { readonly text: string; readonly testId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Co to znaczy?"
            onClick={() => setOpen((value) => !value)}
            data-testid={testId}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full text-label-tertiary transition-colors hover:bg-fill-quaternary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-[300px] py-2 leading-[19px]">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
