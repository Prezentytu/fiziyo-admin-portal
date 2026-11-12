'use client';

import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VerificationQueueSort } from '@/graphql/types/adminExercise.types';
import { cn } from '@/lib/utils';

import {
  DEFAULT_QUEUE_ORDERING,
  isDefaultQueueOrdering,
  parseQueueDay,
  type VerificationQueueOrdering,
} from './utils/queueOrdering';

interface VerificationQueueOrderingControlsProps {
  readonly ordering: VerificationQueueOrdering;
  readonly onChange: (next: VerificationQueueOrdering) => void;
  /** Data, po której kolejka sortuje i filtruje (`queueDateLabel`). */
  readonly dateLabel: string;
  /** Prefiks `data-testid`, np. `verification` → `verification-sort-select`. */
  readonly testIdPrefix: string;
  readonly className?: string;
}

/** Sortowanie od najnowszych albo najstarszych i zakres dni; jedna kontrolka dla wszystkich kolejek weryfikacji. */
export function VerificationQueueOrderingControls({
  ordering,
  onChange,
  dateLabel,
  testIdPrefix,
  className,
}: VerificationQueueOrderingControlsProps) {
  const setDay = (key: 'dateFrom' | 'dateTo', value: string) => onChange({ ...ordering, [key]: parseQueueDay(value) });

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      role="group"
      aria-label="Kolejność i zakres dat"
      data-testid={`${testIdPrefix}-ordering`}
    >
      <Select
        value={ordering.sort}
        onValueChange={(value) => onChange({ ...ordering, sort: value as VerificationQueueSort })}
        data-testid={`${testIdPrefix}-sort`}
      >
        <SelectTrigger
          size="sm"
          className="w-[150px] bg-surface border-border/60"
          aria-label="Kolejność"
          data-testid={`${testIdPrefix}-sort-select`}
        >
          <SelectValue>{ordering.sort === 'OLDEST' ? 'Najstarsze' : 'Najnowsze'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NEWEST" data-testid={`${testIdPrefix}-sort-newest`}>
            Najnowsze
          </SelectItem>
          <SelectItem value="OLDEST" data-testid={`${testIdPrefix}-sort-oldest`}>
            Najstarsze
          </SelectItem>
        </SelectContent>
      </Select>

      <span className="text-xs text-muted-foreground">{dateLabel}</span>
      <Input
        type="date"
        aria-label={`${dateLabel} od`}
        className="h-8 w-[150px] bg-surface border-border/60 text-sm"
        value={ordering.dateFrom}
        max={ordering.dateTo || undefined}
        onChange={(event) => setDay('dateFrom', event.target.value)}
        data-testid={`${testIdPrefix}-date-from`}
      />
      <span className="text-xs text-muted-foreground" aria-hidden="true">
        –
      </span>
      <Input
        type="date"
        aria-label={`${dateLabel} do`}
        className="h-8 w-[150px] bg-surface border-border/60 text-sm"
        value={ordering.dateTo}
        min={ordering.dateFrom || undefined}
        onChange={(event) => setDay('dateTo', event.target.value)}
        data-testid={`${testIdPrefix}-date-to`}
      />

      {!isDefaultQueueOrdering(ordering) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-muted-foreground"
          onClick={() => onChange(DEFAULT_QUEUE_ORDERING)}
          data-testid={`${testIdPrefix}-ordering-clear`}
        >
          <X className="h-3.5 w-3.5" />
          Wyczyść
        </Button>
      )}
    </div>
  );
}
