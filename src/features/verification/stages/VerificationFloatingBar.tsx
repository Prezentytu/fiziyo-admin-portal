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
 * Action bar docked to the bottom of the stage column, so it never covers the media panel.
 * Sticky stops at the `<main>` padding edge, which keeps a small, even gap to the window bottom.
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
    <div className="sticky bottom-0 z-30 mt-auto pt-2" data-testid="verification-floating-bar">
      <div className="flex w-full flex-wrap items-center gap-2 rounded-[20px] border-[0.5px] border-separator bg-elevated py-1.5 pl-4 pr-1.5 shadow-floating sm:flex-nowrap">
        <p
          className={cn(
            'min-w-0 flex-1 truncate text-[13px] leading-[18px]',
            isBlocked ? 'font-semibold text-status-warning' : 'text-label-secondary'
          )}
          role="status"
          aria-live="polite"
          title={hint}
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
