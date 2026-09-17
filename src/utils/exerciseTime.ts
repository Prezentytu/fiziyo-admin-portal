export interface ExerciseDurationParams {
  sets: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  side?: string;
  type?: string | number;
}

/**
 * Szacowany czas ćwiczenia — ten sam wzór co player (`computePlannedDurationSec`).
 * `rest` to alias `restSets` dla starych wywołań.
 */
export function calculateEstimatedTime(
  params: ExerciseDurationParams & { rest?: number },
): number {
  return calculateExerciseTotalSeconds({
    ...params,
    restSets: params.restSets ?? params.rest,
  }).seconds;
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

  // Wspierane formaty:
  //   1) "3-0-1-0" (z separatorami) - klasyczny zapis tempa
  //   2) "3010" (3-4 cyfry bez separatora) - format skompresowany uzywany przez
  //      CreateExerciseWizard (input akceptuje tylko cyfry, max 4) oraz backend AI
  //      (prompt nakazuje "DOKLADNIE 4 cyfry bez separatorow"). Bez tej galezi
  //      "3010" parsowalo sie jako 3010 sekund/powt. → totalDuration ~1208 min.
  const segments =
    !normalizedTempo.includes('-') && /^\d{3,4}$/.test(normalizedTempo)
      ? [...normalizedTempo]
      : normalizedTempo.split('-').map((segment) => segment.trim());

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

function isTimeExerciseType(type: string | number | undefined): boolean | null {
  if (type == null) {
    return null;
  }

  if (typeof type === 'number') {
    return type === 1;
  }

  const normalized = type.trim().toLowerCase();
  if (normalized === 'time') {
    return true;
  }
  if (normalized === 'reps') {
    return false;
  }

  return null;
}

/**
 * Łączny czas ćwiczenia zgodny z playerem:
 * executionTime → timer na powtórzenie;
 * TIME + duration → duration × powtórzenia (nie override całej serii);
 * REPS + duration → duration ignorowane, 3 s albo tempo;
 * BOTH podwaja cały blok pracy wraz z przerwami między seriami, bez przygotowania.
 */
export function calculateExerciseTotalSeconds(
  params: ExerciseDurationParams,
): { seconds: number; isEstimate: boolean } {
  const sets = Math.max(0, Math.floor(params.sets));
  if (sets <= 0) {
    return { seconds: 0, isEstimate: false };
  }

  const reps =
    params.reps != null && Number.isFinite(params.reps) && params.reps > 0
      ? Math.floor(params.reps)
      : 1;
  const side = params.side?.toLowerCase();
  const sideMultiplier = side === 'both' ? 2 : 1;

  const preparationTime = normalizePositiveNumber(params.preparationTime);
  const restSets = normalizePositiveNumber(params.restSets);
  const restReps = normalizePositiveNumber(params.restReps);
  const durationOverride = normalizePositiveNumber(params.duration);
  const executionTime = normalizePositiveNumber(params.executionTime);
  const tempoExecutionTime = parseTempo(params.tempo);

  const typedTime = isTimeExerciseType(params.type);
  const isTimeMode =
    executionTime > 0 || typedTime === true || (typedTime !== false && durationOverride > 0);

  let perRepTime = 0;
  let isEstimate = false;

  if (executionTime > 0) {
    perRepTime = executionTime;
  } else if (isTimeMode) {
    if (durationOverride > 0) {
      perRepTime = durationOverride;
    } else if (tempoExecutionTime != null) {
      perRepTime = tempoExecutionTime;
    } else {
      return { seconds: 0, isEstimate: false };
    }
  } else if (tempoExecutionTime != null) {
    perRepTime = tempoExecutionTime;
  } else {
    perRepTime = 3;
    isEstimate = true;
  }

  if (perRepTime <= 0) {
    return { seconds: 0, isEstimate: false };
  }

  const workBlock =
    (perRepTime * reps + restReps * Math.max(0, reps - 1)) * sets + restSets * Math.max(0, sets - 1);

  return {
    seconds: preparationTime + workBlock * sideMultiplier,
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
