/**
 * Oblicza szacowany czas wykonania ćwiczenia w sekundach.
 *
 * Priorytet:
 * 1) executionTime > 0: seria = reps * executionTime + mikroprzerwy
 * 2) duration > 0: duration traktujemy jako override czasu jednej serii
 * 3) fallback: 3 sekundy na powtórzenie
 */
export function calculateEstimatedTime(params: {
  sets: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  rest?: number;
  restReps?: number;
}): number {
  const { sets, reps, duration, executionTime, rest = 60, restReps = 0 } = params;

  const repsPerSet = reps || 10;
  const normalizedExecutionTime = executionTime && executionTime > 0 ? executionTime : 0;
  const durationOverride = duration && duration > 0 ? duration : 0;

  let exerciseTime = 0;
  let microBreakTime = 0;

  if (normalizedExecutionTime > 0) {
    exerciseTime = sets * repsPerSet * normalizedExecutionTime;
    microBreakTime = sets * Math.max(0, repsPerSet - 1) * Math.max(0, restReps);
  } else if (durationOverride > 0) {
    exerciseTime = sets * durationOverride;
  } else {
    exerciseTime = sets * repsPerSet * 3;
    microBreakTime = sets * Math.max(0, repsPerSet - 1) * Math.max(0, restReps);
  }

  const restTime = Math.max(0, sets - 1) * rest;

  return exerciseTime + microBreakTime + restTime;
}

/**
 * Formatuje czas w sekundach do czytelnego formatu.
 *
 * Przykłady:
 * - 90 sekund → "~2 min"
 * - 45 sekund → "~1 min"
 * - 180 sekund → "~3 min"
 */
export function formatEstimatedTime(seconds: number): string {
  if (seconds <= 0) return '~0 min';

  const minutes = Math.round(seconds / 60);

  if (minutes < 1) {
    return '~1 min';
  }

  return `~${minutes} min`;
}

/**
 * Mapuje wartość Side na ikonę/label do wyświetlenia.
 *
 * - None / Both → "↔" (obustronne)
 * - Left → "L"
 * - Right → "R"
 * - Alternating → "⟳"
 */
export function getSideIndicator(side: string | undefined | null): { icon: string; label: string; showBadge: boolean } {
  const normalizedSide = side?.toLowerCase() || 'none';

  switch (normalizedSide) {
    case 'left':
      return { icon: 'L', label: 'Lewa strona', showBadge: true };
    case 'right':
      return { icon: 'R', label: 'Prawa strona', showBadge: true };
    case 'alternating':
      return { icon: '⟳', label: 'Naprzemiennie', showBadge: true };
    case 'both':
      return { icon: '↔', label: 'Obustronne', showBadge: false };
    case 'none':
    default:
      return { icon: '↔', label: 'Obustronne', showBadge: false };
  }
}

/**
 * Sprawdza czy strona wymaga wyświetlenia badge'a (jest inna niż domyślna).
 */
export function shouldShowSideBadge(side: string | undefined | null): boolean {
  const normalizedSide = side?.toLowerCase() || 'none';
  return normalizedSide === 'left' || normalizedSide === 'right' || normalizedSide === 'alternating';
}
