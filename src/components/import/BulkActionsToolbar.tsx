'use client';

import { Check, X, Link2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

type ExerciseAction = 'create' | 'reuse' | 'skip';
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
 * Pasek narzędzi bulk actions dla review ćwiczeń
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
        return `Do utworzenia (${createCount})`;
      case 'reuse':
        return `Istniejące (${reuseCount})`;
      case 'skip':
        return `Pominięte (${skipCount})`;
      case 'matched':
        return `Z dopasowaniem (${matchedCount})`;
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface-light p-3',
        className
      )}
    >
      {/* Left side - bulk actions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1">Wszystkie:</span>

        <Button
          variant="outline"
          size="sm"
          onClick={onSetAllCreate}
          disabled={disabled}
          className="gap-1.5 h-8"
        >
          <Check className="h-3.5 w-3.5 text-primary" />
          Utwórz nowe
        </Button>

        {matchedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUseAllMatched}
            disabled={disabled}
            className="gap-1.5 h-8"
          >
            <Link2 className="h-3.5 w-3.5 text-blue-500" />
            Użyj dopasowanych ({matchedCount})
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onSetAllSkip}
          disabled={disabled}
          className="gap-1.5 h-8"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
          Pomiń
        </Button>
      </div>

      {/* Right side - filter */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-8">
              <Filter className="h-3.5 w-3.5" />
              {getFilterLabel(activeFilter)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Filtruj według</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => onFilterChange('all')}
              className={cn(activeFilter === 'all' && 'bg-primary/10')}
            >
              <span className="flex-1">Wszystkie</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {totalCount}
              </Badge>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onFilterChange('create')}
              className={cn(activeFilter === 'create' && 'bg-primary/10')}
            >
              <Check className="mr-2 h-4 w-4 text-primary" />
              <span className="flex-1">Do utworzenia</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {createCount}
              </Badge>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onFilterChange('reuse')}
              className={cn(activeFilter === 'reuse' && 'bg-primary/10')}
            >
              <Link2 className="mr-2 h-4 w-4 text-blue-500" />
              <span className="flex-1">Istniejące</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {reuseCount}
              </Badge>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onFilterChange('skip')}
              className={cn(activeFilter === 'skip' && 'bg-primary/10')}
            >
              <X className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Pominięte</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {skipCount}
              </Badge>
            </DropdownMenuItem>

            {matchedCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onFilterChange('matched')}
                  className={cn(activeFilter === 'matched' && 'bg-primary/10')}
                >
                  <span className="flex-1">Z dopasowaniem AI</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {matchedCount}
                  </Badge>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
