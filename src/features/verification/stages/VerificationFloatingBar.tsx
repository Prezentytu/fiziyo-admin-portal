import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VerificationFloatingBarProps {
  hint: string;
  isBlocked: boolean;
  /** Blocked only by suggestions: soft hint and a one-click accept next to the primary action. */
  acceptSuggestions?: { onClick: () => void };
  primaryLabel: string;
  onPrimary: () => void;
  isBusy?: boolean;
  /** Review actions next to the primary one (send to author, internal fixes, duplicate), in display order. */
  secondary?: readonly FloatingBarAction[];
}

export interface FloatingBarAction {
  label: string;
  testId: string;
  onClick: () => void;
  /** Why the action is unavailable; the button stays visible but inactive with this hint. */
  disabledHint?: string;
}

/**
 * Footer docked to the bottom edge of the dashboard scroll area. Content ends above it instead of scrolling
 * underneath a floating pill: the negative bottom inset cancels the `<main>` padding (p-4 lg:p-6 2xl:p-8)
 * and the solid band spans the sheet width, so nothing shows below or beside it.
 */
export function VerificationFloatingBar({
  hint,
  isBlocked,
  acceptSuggestions,
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
            !isBlocked
              ? 'text-label-secondary'
              : acceptSuggestions
                ? 'font-medium text-status-suggestion'
                : 'font-semibold text-status-warning'
          )}
          role="status"
          aria-live="polite"
        >
          {hint}
        </p>
        {acceptSuggestions && (
          <Button
            type="button"
            variant="tinted"
            onClick={acceptSuggestions.onClick}
            disabled={isBusy}
            data-testid="verification-bar-accept-suggestions-btn"
          >
            Akceptuj sugestie
          </Button>
        )}
        {secondary?.map((action) =>
          action.disabledHint ? (
            // A disabled button gets no pointer events, so the hint sits on a focusable wrapper.
            <span
              key={action.testId}
              tabIndex={0}
              title={action.disabledHint}
              aria-label={`${action.label}: ${action.disabledHint}`}
              data-testid={`${action.testId}-hint`}
            >
              <Button
                type="button"
                variant="ghost"
                disabled
                data-testid={action.testId}
                className="pointer-events-none"
              >
                {action.label}
              </Button>
            </span>
          ) : (
            <Button
              key={action.testId}
              type="button"
              variant="ghost"
              onClick={action.onClick}
              disabled={isBusy}
              data-testid={action.testId}
            >
              {action.label}
            </Button>
          )
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
