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

function positiveOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
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
  const advancedExecutionTime = positiveOrNull(suggestion.advancedParams?.executionTime);
  const suggestedDuration = positiveOrNull(suggestion.duration);
  const timeBasedSeconds = suggestion.type === 'time' ? (advancedExecutionTime ?? suggestedDuration) : null;

  const base = {
    sets: positiveOrNull(suggestion.sets) ?? prev.sets,
    restSets: positiveOrNull(suggestion.restSets) ?? prev.restSets,
    preparationTime: positiveOrNull(suggestion.advancedParams?.preparationTime) ?? prev.preparationTime,
  };

  if (timeBasedSeconds !== null) {
    return { ...base, reps: 1, executionTime: timeBasedSeconds, duration: null };
  }

  return {
    ...base,
    reps: positiveOrNull(suggestion.reps) ?? prev.reps,
    duration: suggestion.type === 'time' ? prev.duration : (suggestedDuration ?? prev.duration),
    executionTime: advancedExecutionTime ?? prev.executionTime,
  };
}
