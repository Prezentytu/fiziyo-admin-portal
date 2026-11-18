'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { FieldHelpTooltip } from '@/components/shared/FieldHelpTooltip';
import type { FieldHelp } from '@/utils/fieldHelp';
import type { ComputedExerciseTimeLabels } from './computedExerciseTime';

const TOTAL_HELP: FieldHelp = {
  summary: 'Ile trwa całe ćwiczenie u pacjenta.',
  points: [
    { term: 'Liczone z', text: 'wszystkich serii, przerw i czasu przygotowania.' },
    { term: 'Zmiana', text: 'wynika z pól powyżej; tej wartości nie wpisujesz.' },
  ],
};

const SERIES_HELP: FieldHelp = {
  summary: 'Ile trwa jedna seria.',
  points: [
    { term: 'Liczone z', text: 'powtórzeń × czasu powtórzenia oraz przerw między powtórzeniami.' },
    { term: 'Zmiana', text: 'wynika z pól powyżej; tej wartości nie wpisujesz.' },
  ],
};

/**
 * Czas wyliczany w podglądzie i w edycji parametrów: czas ćwiczenia jest wartością główną,
 * czas jednej serii pomocniczą linią pod nim (wcześniej dwa równe kafle myliły się ze sobą).
 */
export function ExerciseComputedTime({
  times,
  testIdPrefix,
}: Readonly<{ times: ComputedExerciseTimeLabels; testIdPrefix: string }>) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-xl bg-surface px-4 py-3 shadow-sm" data-testid={`${testIdPrefix}-computed-time`}>
        <div className="flex items-center justify-between gap-3" data-testid={`${testIdPrefix}-total-time`}>
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            Czas ćwiczenia (wyliczany)
            <FieldHelpTooltip label="Czas ćwiczenia" help={TOTAL_HELP} testId={`${testIdPrefix}-total-time-info`} />
          </span>
          <span className="text-lg font-bold leading-tight tabular-nums text-foreground">{times.total ?? '—'}</span>
        </div>
        <div
          className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground"
          data-testid={`${testIdPrefix}-series-time`}
        >
          <span className="flex items-center gap-1">
            Jedna seria
            <FieldHelpTooltip label="Jedna seria" help={SERIES_HELP} testId={`${testIdPrefix}-series-time-info`} />
          </span>
          <span className="tabular-nums">{times.series ?? '—'}</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
