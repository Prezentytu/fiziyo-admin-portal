'use client';

import { cn } from '@/lib/utils';
import {
  getDescriptionPlayerHints,
  getLongestPlayerHint,
  getPlayerHintLength,
} from '@/features/exercises/utils/playerHintLength';

interface PlayerHintLengthCounterProps {
  text: string | null | undefined;
  testId: string;
  id?: string;
  /** Lead sentence shown before the count, e.g. why the description reaches the player. */
  lead?: string;
  className?: string;
}

export function PlayerHintLengthCounter({ text, testId, id, lead, className }: Readonly<PlayerHintLengthCounterProps>) {
  const { length, max, status } = getPlayerHintLength(text);
  if (status === 'empty') return null;

  const isTooLong = status === 'too-long';
  return (
    <p
      id={id}
      className={cn('text-[12px] leading-snug', isTooLong ? 'text-status-warning' : 'text-muted-foreground', className)}
      data-testid={testId}
      data-status={status}
    >
      {lead ? `${lead} ` : null}
      <span className="tabular-nums">
        {length}/{max}
      </span>
      {isTooLong
        ? ` · Za długie do playera: pacjent zobaczy skrót. Skróć do ${max} znaków.`
        : ' · mieści się w playerze w całości'}
    </p>
  );
}

interface DescriptionPlayerHintCounterProps {
  description: string | null | undefined;
  steps: readonly string[] | null | undefined;
  testId: string;
  id?: string;
}

/** The player shows the description as hints only when the exercise has no steps. */
export function DescriptionPlayerHintCounter({
  description,
  steps,
  testId,
  id,
}: Readonly<DescriptionPlayerHintCounterProps>) {
  const hints = getDescriptionPlayerHints(description, steps);
  if (hints.length === 0) return null;

  return (
    <PlayerHintLengthCounter
      id={id}
      testId={testId}
      text={getLongestPlayerHint(hints)}
      lead={
        hints.length > 1
          ? 'Bez kroków player pokaże 2 pierwsze linie opisu jako wskazówki. Najdłuższa:'
          : 'Bez kroków player pokaże pierwszą linię opisu jako wskazówkę:'
      }
    />
  );
}
