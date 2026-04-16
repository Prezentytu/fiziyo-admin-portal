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

function normalizePositiveNumber(value: number | undefined): number {
  if (value == null || Number.isNaN(value) || value <= 0) {
    return 0;
  }

  return value;
}

export function parseTempo(tempo: string | undefined): number | null {
  const normalizedTempo = tempo?.trim();
  if (!normalizedTempo) {
    return null;
  }

  const segments = normalizedTempo.split('-').map((segment) => segment.trim());
  if (segments.length === 0) {
    return null;
  }

  let totalSeconds = 0;
  for (const segment of segments) {
    if (!/^\d+$/.test(segment)) {
      return null;
    }

    totalSeconds += Number(segment);
  }

  return totalSeconds > 0 ? totalSeconds : null;
}

export function calculateExerciseTotalSeconds(params: {
  sets: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  side?: string;
}): { seconds: number; isEstimate: boolean } {
  const sets = Math.max(0, Math.floor(params.sets));
  if (sets <= 0) {
    return { seconds: 0, isEstimate: false };
  }

  const reps = Math.max(1, Math.floor(params.reps ?? 10));
  const side = params.side?.toLowerCase();
  const sideMultiplier = side === 'both' ? 2 : 1;
  const effectiveReps = reps * sideMultiplier;

  const preparationTime = normalizePositiveNumber(params.preparationTime);
  const restSets = normalizePositiveNumber(params.restSets);
  const restReps = normalizePositiveNumber(params.restReps);
  const durationOverride = normalizePositiveNumber(params.duration);
  const executionTime = normalizePositiveNumber(params.executionTime);
  const tempoExecutionTime = parseTempo(params.tempo);

  const repetitionTime = executionTime > 0 ? executionTime : (tempoExecutionTime ?? 3);
  const isEstimate = executionTime <= 0 && tempoExecutionTime == null && durationOverride <= 0;

  const timePerSet =
    durationOverride > 0
      ? durationOverride
      : effectiveReps * repetitionTime + Math.max(0, effectiveReps - 1) * restReps;

  const setsTime = sets * timePerSet;
  const interSetRestTime = Math.max(0, sets - 1) * restSets;

  return {
    seconds: preparationTime + setsTime + interSetRestTime,
    isEstimate,
  };
}

export function formatExerciseDuration(seconds: number, isEstimate: boolean): string {
  const normalizedSeconds = Math.max(0, Math.round(seconds));
  const estimatePrefix = isEstimate ? '~' : '';

  if (normalizedSeconds < 60) {
    return `${estimatePrefix}${normalizedSeconds} s`;
  }

  const minutes = Math.floor(normalizedSeconds / 60);
  const remainingSeconds = normalizedSeconds % 60;

  if (isEstimate) {
    return `${estimatePrefix}${Math.max(1, Math.round(normalizedSeconds / 60))} min`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds} s`;
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
