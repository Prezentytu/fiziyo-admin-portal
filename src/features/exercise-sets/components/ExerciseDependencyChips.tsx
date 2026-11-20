'use client';

import { Bell, Flame, Lock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { DependencyChip } from '../utils/exerciseDependencies';

interface ExerciseDependencyChipsProps {
  readonly chips: readonly DependencyChip[];
  readonly testId: string;
}

/** Chipy pozycji zestawu: „Rozgrzewka”, „Po rozgrzewce”, „Po: {ćwiczenie}”, „Przypomina” (SPEC-061 P1). */
export function ExerciseDependencyChips({ chips, testId }: ExerciseDependencyChipsProps) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid={testId}>
      {chips.map((chip, index) => {
        const key = `${chip.kind}-${chip.kind === 'after' ? chip.name : ''}-${index}`;
        if (chip.kind === 'warmup') {
          return (
            <Badge key={key} variant="warning">
              <Flame className="h-3 w-3" aria-hidden="true" />
              Rozgrzewka
            </Badge>
          );
        }
        if (chip.kind === 'remind') {
          return (
            <Badge key={key} variant="outline">
              <Bell className="h-3 w-3" aria-hidden="true" />
              Przypomina
            </Badge>
          );
        }
        return (
          <Badge key={key} variant="secondary" className="max-w-full">
            <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{chip.kind === 'after-warmup' ? 'Po rozgrzewce' : `Po: ${chip.name}`}</span>
          </Badge>
        );
      })}
    </div>
  );
}
