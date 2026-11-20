'use client';

import { Archive, Check, UserMinus, UserPlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface VerificationSelectionToolbarProps {
  selectedCount: number;
  visibleCount: number;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  onToggleVisible: () => void;
  onClear: () => void;
  onArchive: () => void;
  /** Off where the queue has nothing to archive (only published exercises can be withdrawn). */
  canArchive?: boolean;
  /** Take the selected exercises (true) or release them (false); hidden when not provided. */
  onAssign?: (assign: boolean) => void;
  isAssigning?: boolean;
  disabled?: boolean;
  isArchiving?: boolean;
  className?: string;
}

export function VerificationSelectionToolbar({
  selectedCount,
  visibleCount,
  allVisibleSelected,
  someVisibleSelected,
  onToggleVisible,
  onClear,
  onArchive,
  canArchive = true,
  onAssign,
  isAssigning = false,
  disabled = false,
  isArchiving = false,
  className,
}: VerificationSelectionToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const visibleSelectionState = someVisibleSelected ? 'indeterminate' : allVisibleSelected;

  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/50 bg-card p-3 shadow-sm',
        className
      )}
      data-testid="verification-selection-toolbar"
    >
      <div className="flex min-w-0 items-center gap-3">
        <Checkbox
          checked={visibleSelectionState}
          onCheckedChange={onToggleVisible}
          disabled={disabled || visibleCount === 0}
          aria-label={allVisibleSelected ? 'Odznacz ćwiczenia na tej stronie' : 'Zaznacz ćwiczenia na tej stronie'}
          data-testid="verification-selection-page-checkbox"
        />
        <span className="text-sm font-medium text-foreground" data-testid="verification-selection-count">
          Zaznaczono: {selectedCount}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {allVisibleSelected ? 'Cała bieżąca strona' : 'Wybrane ćwiczenia'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={disabled}
          className="gap-2"
          data-testid="verification-selection-clear-btn"
        >
          <X className="h-4 w-4" />
          Wyczyść
        </Button>
        {onAssign && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAssign(false)}
              disabled={disabled || isAssigning}
              className="gap-2"
              data-testid="verification-selection-unassign-btn"
            >
              <UserMinus className="h-4 w-4" />
              Zdejmij ze mnie
            </Button>
            <Button
              size="sm"
              onClick={() => onAssign(true)}
              disabled={disabled || isAssigning}
              className="gap-2"
              data-testid="verification-selection-assign-btn"
            >
              <UserPlus className="h-4 w-4" />
              Przypisz do mnie
            </Button>
          </>
        )}
        {canArchive && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onArchive}
            disabled={disabled || isArchiving}
            className="gap-2"
            data-testid="verification-selection-archive-btn"
          >
            {isArchiving ? <Check className="h-4 w-4 animate-pulse" /> : <Archive className="h-4 w-4" />}
            {isArchiving ? 'Archiwizowanie…' : 'Archiwizuj zaznaczone'}
          </Button>
        )}
      </div>
    </div>
  );
}
