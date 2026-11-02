import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VerificationFloatingBarProps {
  hint: string;
  isBlocked: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  isBusy?: boolean;
  secondary?: { label: string; testId: string; onClick: () => void };
}

/**
 * Action bar pinned to the bottom edge of the dashboard scroll area. The negative bottom inset cancels the
 * `<main>` padding (p-4 lg:p-6 2xl:p-8) and the fade spans the whole sheet, so content scrolls away under
 * a solid edge instead of showing through a gap below the pill.
 */
export function VerificationFloatingBar({
  hint,
  isBlocked,
  primaryLabel,
  onPrimary,
  isBusy = false,
  secondary,
}: VerificationFloatingBarProps) {
  return (
    <div
      className="pointer-events-none sticky -bottom-4 z-30 -mx-4 flex justify-center bg-gradient-to-t from-card from-40% to-transparent px-4 pb-4 pt-10 sm:-mx-8 sm:px-8 lg:-bottom-6 lg:pb-6 xl:-mx-11 xl:px-11 2xl:-bottom-8"
      data-testid="verification-floating-bar"
    >
      <div className="pointer-events-auto flex w-full max-w-[880px] flex-wrap items-center gap-3 rounded-[28px] border-[0.5px] border-separator bg-elevated py-2 pl-5 pr-2 shadow-floating sm:flex-nowrap">
        <p
          className={cn(
            'min-w-0 flex-1 text-[14px] leading-5',
            isBlocked ? 'font-semibold text-status-warning' : 'text-label-secondary'
          )}
          role="status"
          aria-live="polite"
        >
          {hint}
        </p>
        {secondary && (
          <Button type="button" variant="ghost" onClick={secondary.onClick} disabled={isBusy} data-testid={secondary.testId}>
            {secondary.label}
          </Button>
        )}
        <Button
          type="button"
          onClick={onPrimary}
          disabled={isBlocked || isBusy}
          data-testid="verification-bar-primary-btn"
        >
          {isBusy && <Loader2 className="animate-spin" />}
          {primaryLabel}
          <kbd className="ml-1 hidden rounded-badge bg-on-tint/20 px-1.5 text-[12px] font-semibold sm:inline">⌘↵</kbd>
        </Button>
      </div>
    </div>
  );
}
