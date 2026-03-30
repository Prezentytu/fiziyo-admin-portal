'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImportStickyFooterProps {
  /** Number of exercises that will use existing ones */
  reuseCount: number;
  /** Number of new exercises to create */
  createCount: number;
  /** Number of exercises to skip */
  skipCount: number;
  createSetAfterImport?: boolean;
  onCreateSetChange?: (checked: boolean) => void;
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
 * Shows compact summary and main action button
 */
export function ImportStickyFooter({
  reuseCount,
  createCount,
  skipCount,
  createSetAfterImport: _createSetAfterImport = false,
  onCreateSetChange: _onCreateSetChange,
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
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Do importu: {totalToImport}</span>
            <span className="text-muted-foreground">({reuseCount} dopasowanych, {createCount} nowych)</span>
            {skipCount > 0 && <span className="text-muted-foreground">• pominięte: {skipCount}</span>}
          </div>
          <Button
            size="lg"
            onClick={onAction}
            disabled={disabled || isLoading || totalToImport === 0}
            className="gap-2 h-11 px-8 bg-primary hover:bg-primary-dark"
            data-testid="import-footer-action-btn"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
