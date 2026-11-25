import {
  estimateEffectiveExerciseSeconds,
  resolveEffectiveExerciseParams,
  type EffectiveMappingSource,
} from '@/components/shared/exercise/resolveEffectiveExerciseParams';

/**
 * Szacowany czas jednej sesji zestawu (sekundy): suma czasów pozycji z rozwiązanych parametrów.
 * Ta sama reguła na karcie zestawu i w szczegółach zestawu.
 */
export function estimateSetSeconds(mappings: readonly EffectiveMappingSource[] | null | undefined): number {
  let total = 0;
  for (const mapping of mappings ?? []) {
    total += estimateEffectiveExerciseSeconds(resolveEffectiveExerciseParams(mapping));
  }
  return Math.max(0, Math.round(total));
}

/** Rozbicie czasu zestawu na minuty i sekundy do licznika w szczegółach zestawu. */
export function splitSetDuration(totalSeconds: number): { minutes: number; seconds: number } {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  return { minutes: Math.floor(safe / 60), seconds: safe % 60 };
}

/** Różnica czasu po zmianie parametrów, np. „+16 s”, „−1 min 05 s”. Zero: pusty tekst. */
export function formatSetDurationDelta(deltaSeconds: number): string {
  const rounded = Number.isFinite(deltaSeconds) ? Math.round(deltaSeconds) : 0;
  if (rounded === 0) return '';
  const sign = rounded > 0 ? '+' : '−';
  const { minutes, seconds } = splitSetDuration(Math.abs(rounded));
  if (minutes === 0) return `${sign}${seconds} s`;
  if (seconds === 0) return `${sign}${minutes} min`;
  return `${sign}${minutes} min ${String(seconds).padStart(2, '0')} s`;
}
