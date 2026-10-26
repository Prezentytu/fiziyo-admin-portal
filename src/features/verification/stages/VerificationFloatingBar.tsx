import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VerificationFloatingBarProps {
  hint: string;
  isBlocked: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  isBusy?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function VerificationFloatingBar({
  hint,
  isBlocked,
  primaryLabel,
  onPrimary,
  isBusy = false,
  secondaryLabel,
  onSecondary,
}: VerificationFloatingBarProps) {
  return (
    <div
      className="pointer-events-none sticky bottom-4 z-30 flex justify-center"
      data-testid="verification-floating-bar"
    >
      <div className="pointer-events-auto flex w-full max-w-[880px] flex-wrap items-center gap-3 rounded-[28px] bg-elevated/95 py-2 pl-5 pr-2 shadow-floating backdrop-blur sm:flex-nowrap">
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
        {secondaryLabel && onSecondary && (
          <Button
            type="button"
            variant="ghost"
            onClick={onSecondary}
            disabled={isBusy}
            data-testid="verification-bar-duplicate-btn"
          >
            {secondaryLabel}
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
