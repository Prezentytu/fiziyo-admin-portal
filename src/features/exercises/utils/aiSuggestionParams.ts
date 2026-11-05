import type { ExerciseSuggestionResponse } from '@/types/ai.types';

export interface AiSuggestionParamsTarget {
  sets: number | null;
  reps: number | null;
  duration: number | null;
  restSets: number | null;
  preparationTime: number | null;
  executionTime: number | null;
}

type AiParamsSuggestion = Pick<
  ExerciseSuggestionResponse,
  'type' | 'sets' | 'reps' | 'duration' | 'restSets' | 'advancedParams'
>;

type AiSuggestionType = ExerciseSuggestionResponse['type'];

/** Liczba z AI, której można użyć: dodatnia, skończona, zaokrąglona. Inaczej null. */
export function positiveAiNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

/**
 * Czas powtórzenia z sugestii AI. Pierwszeństwo ma `advancedParams.executionTime`;
 * ćwiczenie na czas bez niego bierze `duration` (czas utrzymania w serii).
 */
export function aiSuggestionExecutionTime(
  suggestion: Pick<ExerciseSuggestionResponse, 'type' | 'duration' | 'advancedParams'>
): number | null {
  return (
    positiveAiNumber(suggestion.advancedParams?.executionTime) ??
    (suggestion.type === 'time' ? positiveAiNumber(suggestion.duration) : null)
  );
}

/**
 * Parametry ćwiczenia po „Zastosuj wszystko” z AI.
 *
 * - Brak albo zero w sugestii nie kasuje wartości, którą kreator już ma.
 * - Ćwiczenie na czas zapisuje czas w `executionTime` (jak preset „30s×3”), z `reps = 1`
 *   i bez legacy `duration`. Inaczej czas powtórzenia zostaje pusty.
 */
export function applyAiSuggestionParams(
  prev: AiSuggestionParamsTarget,
  suggestion: AiParamsSuggestion
): AiSuggestionParamsTarget {
  const executionTime = aiSuggestionExecutionTime(suggestion);

  const base = {
    sets: positiveAiNumber(suggestion.sets) ?? prev.sets,
    restSets: positiveAiNumber(suggestion.restSets) ?? prev.restSets,
    preparationTime: positiveAiNumber(suggestion.advancedParams?.preparationTime) ?? prev.preparationTime,
  };

  if (suggestion.type === 'time' && executionTime !== null) {
    return { ...base, reps: 1, executionTime, duration: null };
  }

  return {
    ...base,
    reps: positiveAiNumber(suggestion.reps) ?? prev.reps,
    duration: suggestion.type === 'time' ? prev.duration : (positiveAiNumber(suggestion.duration) ?? prev.duration),
    executionTime: executionTime ?? prev.executionTime,
  };
}

/**
 * Pojedyncza karta „Czas powtórzenia” z AI. Dla ćwiczenia na czas ten sam zapis co „Zastosuj wszystko”:
 * czas powtórzenia, `reps = 1`, bez legacy `duration`.
 */
export function applyAiExecutionTimeSuggestion(
  prev: AiSuggestionParamsTarget,
  type: AiSuggestionType,
  seconds: number | null | undefined
): AiSuggestionParamsTarget {
  const value = positiveAiNumber(seconds);
  if (value === null) {
    return prev;
  }
  if (type === 'time') {
    return { ...prev, reps: 1, executionTime: value, duration: null };
  }
  return { ...prev, executionTime: value };
}

/**
 * Pojedyncza karta „Czas serii” z AI. Ćwiczenie na czas zapisuje go jak „Czas powtórzenia”,
 * ćwiczenie na powtórzenia w legacy `duration`.
 */
export function applyAiDurationSuggestion(
  prev: AiSuggestionParamsTarget,
  type: AiSuggestionType,
  seconds: number | null | undefined
): AiSuggestionParamsTarget {
  if (type === 'time') {
    return applyAiExecutionTimeSuggestion(prev, type, seconds);
  }
  const value = positiveAiNumber(seconds);
  return value === null ? prev : { ...prev, duration: value };
}

/** Wartość w kreatorze, z którą karta „Czas serii” porównuje sugestię AI. */
export function currentAiDurationValue(
  current: Pick<AiSuggestionParamsTarget, 'duration' | 'executionTime'>,
  type: AiSuggestionType
): number | null {
  return type === 'time' ? current.executionTime : current.duration;
}

export type AiSuggestionParamDiffs = Record<
  'sets' | 'reps' | 'duration' | 'executionTime' | 'preparationTime' | 'restSets',
  boolean
>;

function differs(suggested: number | null, current: number | null): boolean {
  return suggested !== null && suggested !== current;
}

/**
 * Które karty parametrów AI pokazać i policzyć. Karta jest tylko dla wartości, której użyje
 * „Zastosuj wszystko”, więc licznik zgadza się z kartami. Ćwiczenie na czas ma jedną kartę czasu.
 */
export function aiSuggestionParamDiffs(
  suggestion: AiParamsSuggestion,
  current: AiSuggestionParamsTarget
): AiSuggestionParamDiffs {
  const isTime = suggestion.type === 'time';
  const advancedExecutionTime = positiveAiNumber(suggestion.advancedParams?.executionTime);

  return {
    sets: differs(positiveAiNumber(suggestion.sets), current.sets),
    reps: !isTime && differs(positiveAiNumber(suggestion.reps), current.reps),
    duration:
      !(isTime && advancedExecutionTime !== null) &&
      differs(positiveAiNumber(suggestion.duration), currentAiDurationValue(current, suggestion.type)),
    executionTime: differs(advancedExecutionTime, current.executionTime),
    preparationTime: differs(positiveAiNumber(suggestion.advancedParams?.preparationTime), current.preparationTime),
    restSets: differs(positiveAiNumber(suggestion.restSets), current.restSets),
  };
}
