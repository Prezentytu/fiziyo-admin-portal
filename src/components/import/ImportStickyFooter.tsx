'use client';

import { ArrowRight, CheckCircle, Loader2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface ImportStickyFooterProps {
  /** Number of exercises that will use existing ones */
  reuseCount: number;
  /** Number of new exercises to create */
  createCount: number;
  /** Number of exercises to skip */
  skipCount: number;
  /** Whether to create a set after import */
  createSetAfterImport: boolean;
  /** Callback when checkbox changes */
  onCreateSetChange: (checked: boolean) => void;
  /** Callback when user clicks the main action button */
  onAction: () => void;
  /** Label for the action button */
  actionLabel?: string;
  /** Whether action is in progress */
  isLoading?: boolean;
  /** Whether the action button is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Sticky footer for import review
 * Shows summary stats, "Create set" checkbox, and main action button
 */
export function ImportStickyFooter({
  reuseCount,
  createCount,
  skipCount,
  createSetAfterImport,
  onCreateSetChange,
  onAction,
  actionLabel = 'Dalej',
  isLoading = false,
  disabled = false,
  className,
}: ImportStickyFooterProps) {
  const totalToImport = reuseCount + createCount;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-sm',
        'shadow-[0_-4px_20px_rgba(0,0,0,0.15)]',
        className
      )}
      data-testid="import-sticky-footer"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Summary stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground">Importujesz:</span>

            {reuseCount > 0 && (
              <span className="flex items-center gap-1.5 text-green-600 font-medium">
                <CheckCircle className="h-4 w-4" />
                {reuseCount} istniejących
              </span>
            )}

            {createCount > 0 && (
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] text-white font-bold">
                  +
                </span>
                {createCount} nowych
              </span>
            )}

            {skipCount > 0 && (
              <span className="text-muted-foreground">
                ({skipCount} pominiętych)
              </span>
            )}
          </div>

          {/* Right side: checkbox + button */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            {/* Create set checkbox */}
            {totalToImport > 1 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-set-after-import"
                  checked={createSetAfterImport}
                  onCheckedChange={(checked) => onCreateSetChange(checked === true)}
                  disabled={disabled || isLoading}
                  data-testid="import-create-set-checkbox"
                />
                <label
                  htmlFor="create-set-after-import"
                  className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer"
                >
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Stwórz zestaw z importowanych
                </label>
              </div>
            )}

            {/* Main action button */}
            <Button
              size="lg"
              onClick={onAction}
              disabled={disabled || isLoading || totalToImport === 0}
              className="gap-2 h-11 px-8 bg-primary hover:bg-primary-dark"
              data-testid="import-footer-action-btn"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
