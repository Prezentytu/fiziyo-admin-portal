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
 * Footer docked to the bottom edge of the dashboard scroll area. Content ends above it instead of scrolling
 * underneath a floating pill: the negative bottom inset cancels the `<main>` padding (p-4 lg:p-6 2xl:p-8)
 * and the solid band spans the sheet width, so nothing shows below or beside it.
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
      className="sticky -bottom-4 z-30 -mx-4 mt-2 border-t-[0.5px] border-separator bg-card px-4 py-3 sm:-mx-8 sm:px-8 lg:-bottom-6 xl:-mx-11 xl:px-11 2xl:-bottom-8"
      data-testid="verification-floating-bar"
    >
      <div className="flex w-full flex-wrap items-center gap-3 sm:flex-nowrap">
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
          <Button
            type="button"
            variant="ghost"
            onClick={secondary.onClick}
            disabled={isBusy}
            data-testid={secondary.testId}
          >
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
