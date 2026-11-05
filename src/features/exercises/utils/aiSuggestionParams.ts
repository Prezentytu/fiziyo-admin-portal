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

/** Liczba z AI, której można użyć: skończona i po zaokrągleniu dodatnia. Inaczej null. */
export function positiveAiNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : null;
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

/** Czas powtórzenia, gdy sugestia to ćwiczenie na czas z podanym czasem; wtedy seria to jedno utrzymanie. */
function aiTimeBasedSeconds(suggestion: Pick<ExerciseSuggestionResponse, 'type' | 'duration' | 'advancedParams'>) {
  return suggestion.type === 'time' ? aiSuggestionExecutionTime(suggestion) : null;
}

/** Powtórzenia, które zapisze „Zastosuj wszystko”: 1 dla ćwiczenia na czas z czasem, inaczej z AI. */
export function aiSuggestedReps(suggestion: AiParamsSuggestion): number | null {
  return aiTimeBasedSeconds(suggestion) !== null ? 1 : positiveAiNumber(suggestion.reps);
}

/** Obciążenie z AI w kg (np. „20kg”, „2,5 kg”). Bez dodatniej liczby null, np. dla „masa ciała”. */
export function aiSuggestionLoadKg(weight: string | null | undefined): number | null {
  if (!weight) return null;
  const match = weight.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
}

/** Strona ciała z AI. `none` nie ma karty, więc nie nadpisuje strony wybranej w kreatorze. */
export function aiSuggestionSide<T extends string>(suggested: T, current: T): T {
  return suggested !== 'none' ? suggested : current;
}

/**
 * Parametry ćwiczenia po „Zastosuj wszystko” z AI.
 *
 * - Brak albo zero w sugestii nie kasuje wartości, którą kreator już ma.
 * - Ćwiczenie na czas zapisuje czas w `executionTime` (jak preset „30s×3”), z `reps = 1`
 *   i bez legacy `duration`. Inaczej czas powtórzenia zostaje pusty.
 * - AI nie zapisuje legacy `duration`; `duration` z sugestii znaczy tylko czas utrzymania.
 */
export function applyAiSuggestionParams(
  prev: AiSuggestionParamsTarget,
  suggestion: AiParamsSuggestion
): AiSuggestionParamsTarget {
  const executionTime = aiSuggestionExecutionTime(suggestion);
  const timeBasedSeconds = aiTimeBasedSeconds(suggestion);

  const base = {
    sets: positiveAiNumber(suggestion.sets) ?? prev.sets,
    restSets: positiveAiNumber(suggestion.restSets) ?? prev.restSets,
    preparationTime: positiveAiNumber(suggestion.advancedParams?.preparationTime) ?? prev.preparationTime,
  };

  if (timeBasedSeconds !== null) {
    return { ...base, reps: 1, executionTime: timeBasedSeconds, duration: null };
  }

  return {
    ...base,
    reps: positiveAiNumber(suggestion.reps) ?? prev.reps,
    duration: prev.duration,
    executionTime: executionTime ?? prev.executionTime,
  };
}

/**
 * Pojedyncze karty „Czas powtórzenia” i „Czas serii” z AI. Dla ćwiczenia na czas ten sam zapis
 * co „Zastosuj wszystko”: czas powtórzenia, `reps = 1`, bez legacy `duration`.
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

/** Pojedyncza karta „Powtórzenia” z AI: ten sam zapis powtórzeń i czasu co „Zastosuj wszystko”. */
export function applyAiRepsSuggestion(
  prev: AiSuggestionParamsTarget,
  suggestion: AiParamsSuggestion
): AiSuggestionParamsTarget {
  const timeBasedSeconds = aiTimeBasedSeconds(suggestion);
  if (timeBasedSeconds !== null) {
    return applyAiExecutionTimeSuggestion(prev, 'time', timeBasedSeconds);
  }
  const reps = positiveAiNumber(suggestion.reps);
  return reps === null ? prev : { ...prev, reps };
}

export type AiSuggestionParamDiffs = Record<
  'sets' | 'reps' | 'duration' | 'executionTime' | 'preparationTime' | 'restSets',
  boolean
>;

function differs(suggested: number | null, current: number | null): boolean {
  return suggested !== null && suggested !== current;
}

/**
 * Które karty parametrów AI pokazać i policzyć. Karta jest dla każdej zmiany, którą zrobi
 * „Zastosuj wszystko”, i tylko dla niej, więc licznik zgadza się z kartami.
 * Ćwiczenie na czas ma jedną kartę czasu: „Czas serii” tylko bez `advancedParams.executionTime`.
 */
export function aiSuggestionParamDiffs(
  suggestion: AiParamsSuggestion,
  current: AiSuggestionParamsTarget
): AiSuggestionParamDiffs {
  const isTime = suggestion.type === 'time';
  const advancedExecutionTime = positiveAiNumber(suggestion.advancedParams?.executionTime);
  const isTimeBased = aiTimeBasedSeconds(suggestion) !== null;

  return {
    sets: differs(positiveAiNumber(suggestion.sets), current.sets),
    // Ćwiczenie na czas z czasem: karta, gdy kreator nie ma jeszcze jednego utrzymania na serię.
    reps: isTimeBased ? current.reps !== 1 : differs(positiveAiNumber(suggestion.reps), current.reps),
    duration:
      isTime &&
      advancedExecutionTime === null &&
      differs(positiveAiNumber(suggestion.duration), current.executionTime),
    executionTime: differs(advancedExecutionTime, current.executionTime),
    preparationTime: differs(positiveAiNumber(suggestion.advancedParams?.preparationTime), current.preparationTime),
    restSets: differs(positiveAiNumber(suggestion.restSets), current.restSets),
  };
}
