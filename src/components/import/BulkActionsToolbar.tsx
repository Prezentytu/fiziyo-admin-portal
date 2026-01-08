'use client';

import { Check, X, Link2, Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type FilterType = 'all' | 'create' | 'reuse' | 'skip' | 'matched';

interface BulkActionsToolbarProps {
  /** Liczba wszystkich elementów */
  totalCount: number;
  /** Liczba elementów z dopasowaniem */
  matchedCount: number;
  /** Liczba elementów do utworzenia */
  createCount: number;
  /** Liczba elementów do użycia istniejących */
  reuseCount: number;
  /** Liczba elementów do pominięcia */
  skipCount: number;
  /** Aktywny filtr */
  activeFilter: FilterType;
  /** Callback przy zmianie filtra */
  onFilterChange: (filter: FilterType) => void;
  /** Callback - ustaw wszystkie na "utwórz" */
  onSetAllCreate: () => void;
  /** Callback - ustaw wszystkie na "pomiń" */
  onSetAllSkip: () => void;
  /** Callback - użyj sugerowanych dopasowań */
  onUseAllMatched: () => void;
  /** Czy disabled */
  disabled?: boolean;
  className?: string;
}

/**
 * Pasek narzędzi bulk actions - uproszczony dla użytkowników 45+
 * 3 jasne przyciski z tekstem, prosty filtr
 */
export function BulkActionsToolbar({
  totalCount,
  matchedCount,
  createCount,
  reuseCount,
  skipCount,
  activeFilter,
  onFilterChange,
  onSetAllCreate,
  onSetAllSkip,
  onUseAllMatched,
  disabled = false,
  className,
}: BulkActionsToolbarProps) {
  const getFilterLabel = (filter: FilterType): string => {
    switch (filter) {
      case 'all':
        return `Wszystkie (${totalCount})`;
      case 'create':
        return `Nowe do bazy (${createCount})`;
      case 'reuse':
        return `Z mojej bazy (${reuseCount})`;
      case 'skip':
        return `Nie importowane (${skipCount})`;
      case 'matched':
        return `Znalezione w bazie (${matchedCount})`;
    }
  };

  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-surface p-4',
        className
      )}
    >
      {/* Przyciski akcji zbiorczych - czytelne etykiety dla fizjoterapeutów */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">
          Dla wszystkich:
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onSetAllCreate}
          disabled={disabled}
          className="gap-2 h-9"
          data-testid="import-bulk-create-all-btn"
        >
          <Check className="h-4 w-4 text-primary" />
          Dodaj wszystkie do bazy
        </Button>

        {matchedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUseAllMatched}
            disabled={disabled}
            className="gap-2 h-9"
            data-testid="import-bulk-use-matched-btn"
          >
            <Link2 className="h-4 w-4 text-blue-500" />
            Użyj znalezionych ({matchedCount})
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onSetAllSkip}
          disabled={disabled}
          className="gap-2 h-9"
          data-testid="import-bulk-skip-all-btn"
        >
          <X className="h-4 w-4 text-muted-foreground" />
          Nie importuj żadnego
        </Button>
      </div>

      {/* Filtr - prosty dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Filter className="h-4 w-4" />
            {getFilterLabel(activeFilter)}
            <ChevronDown className="h-4 w-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => onFilterChange('all')}
            className={cn('cursor-pointer', activeFilter === 'all' && 'bg-primary/10')}
          >
            Wszystkie ({totalCount})
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onFilterChange('create')}
            className={cn('cursor-pointer', activeFilter === 'create' && 'bg-primary/10')}
          >
            <Check className="mr-2 h-4 w-4 text-primary" />
            Nowe do mojej bazy ({createCount})
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onFilterChange('reuse')}
            className={cn('cursor-pointer', activeFilter === 'reuse' && 'bg-primary/10')}
          >
            <Link2 className="mr-2 h-4 w-4 text-blue-500" />
            Z mojej bazy ({reuseCount})
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onFilterChange('skip')}
            className={cn('cursor-pointer', activeFilter === 'skip' && 'bg-primary/10')}
          >
            <X className="mr-2 h-4 w-4 text-muted-foreground" />
            Nie importowane ({skipCount})
          </DropdownMenuItem>

          {matchedCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onFilterChange('matched')}
                className={cn('cursor-pointer', activeFilter === 'matched' && 'bg-primary/10')}
              >
                Znalezione w bazie ({matchedCount})
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
