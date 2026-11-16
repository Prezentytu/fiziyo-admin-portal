import { calculateExerciseTotalSeconds, formatExerciseDuration } from '@/utils/exerciseTime';

/** Parametry czasu w postaci formularza edycji albo karty (`null` = brak wartości). */
export interface ComputedTimeParams {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  executionTime?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  tempo?: string | null;
  side?: string | null;
}

export interface ComputedTimeOptions {
  /** `undefined` dla szkicu bez typu (kreator tworzenia). */
  type?: 'reps' | 'time';
  /** Rekord 3.3: „naprzemiennie” to liczba na każdą stronę. */
  alternatingPerSide?: boolean;
  /** Wersja rekordu jeszcze nieznana przy stronie „naprzemiennie”: liczba mogłaby być błędna. */
  timeUnknown?: boolean;
}

export interface ComputedExerciseTimeLabels {
  /** Cały czas ćwiczenia: wszystkie serie, przerwy i przygotowanie. `null`, gdy nie da się policzyć. */
  total: string | null;
  /** Jedna seria: powtórzenia z mikroprzerwami, bez przerwy między seriami i przygotowania. */
  series: string | null;
}

const orUndefined = <T>(value: T | null | undefined): T | undefined => (value == null ? undefined : value);

/**
 * Czas ćwiczenia i jednej serii tak, jak liczy je aplikacja pacjenta (`calculateExerciseTotalSeconds`).
 * Jedno źródło dla podglądu ćwiczenia i formularza edycji parametrów.
 */
export function computeExerciseTimeLabels(
  params: ComputedTimeParams,
  { type, alternatingPerSide = false, timeUnknown = false }: ComputedTimeOptions = {}
): ComputedExerciseTimeLabels {
  const shared = {
    reps: orUndefined(params.reps),
    duration: orUndefined(params.duration),
    executionTime: orUndefined(params.executionTime),
    restReps: orUndefined(params.restReps),
    tempo: params.tempo || undefined,
    side: params.side || undefined,
    type,
  };
  const series = calculateExerciseTotalSeconds({
    ...shared,
    alternatingPerSide,
    sets: 1,
    restSets: 0,
    preparationTime: 0,
  });
  const total = calculateExerciseTotalSeconds({
    ...shared,
    alternatingPerSide,
    sets: params.sets ?? 0,
    restSets: orUndefined(params.restSets),
    preparationTime: orUndefined(params.preparationTime),
  });
  const label = (result: { seconds: number; isEstimate: boolean }) =>
    result.seconds > 0 && !timeUnknown ? formatExerciseDuration(result.seconds, result.isEstimate) : null;
  return { total: label(total), series: label(series) };
}
