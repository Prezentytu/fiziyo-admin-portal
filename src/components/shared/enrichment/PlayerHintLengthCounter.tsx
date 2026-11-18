'use client';

import { cn } from '@/lib/utils';
import {
  getPlayerHintLength,
  PATIENT_TEXT_MAX_CHARS,
  type PatientTextKind,
} from '@/features/exercises/utils/playerHintLength';

interface PlayerHintLengthCounterProps {
  text: string | null | undefined;
  testId: string;
  /** `cue`: wskazówka, którą pokazuje player. `step`: krok, który pacjent czyta w szczegółach ćwiczenia. */
  kind?: PatientTextKind;
  id?: string;
  className?: string;
}

const MESSAGES: Record<PatientTextKind, { fits: string; tooLong: (max: number) => string }> = {
  cue: {
    fits: ' · krótka, pacjent przeczyta ją w playerze z odległości',
    tooLong: (max) => ` · Za długa wskazówka do playera. Skróć do ${max} znaków, pełny opis zostaw w kroku.`,
  },
  step: {
    fits: '',
    tooLong: (max) => ` · Długi krok. Skróć do ${max} znaków albo podziel na dwa kroki.`,
  },
};

export function PlayerHintLengthCounter({
  text,
  testId,
  kind = 'cue',
  id,
  className,
}: Readonly<PlayerHintLengthCounterProps>) {
  const { length, max, status } = getPlayerHintLength(text, PATIENT_TEXT_MAX_CHARS[kind]);
  if (status === 'empty') return null;

  const isTooLong = status === 'too-long';
  return (
    <p
      id={id}
      className={cn('text-[12px] leading-snug', isTooLong ? 'text-status-warning' : 'text-muted-foreground', className)}
      data-testid={testId}
      data-status={status}
      data-kind={kind}
    >
      <span className="tabular-nums">
        {length}/{max}
      </span>
      {isTooLong ? MESSAGES[kind].tooLong(max) : MESSAGES[kind].fits}
    </p>
  );
}
