import { EXERCISE_PARAM_DEFAULTS } from '@/components/shared/exercise/exerciseParamDefaults';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import type { ExerciseSuggestionResponse } from '@/types/ai.types';
import { aiSuggestionExecutionTime, positiveAiNumber } from '@/features/exercises/utils/aiSuggestionParams';
import { ENRICHMENT_SCHEMA_V3 } from '@/features/verification/utils/enrichmentToV3';

/** Parameters of a new exercise in the chat card. Times in seconds; 0 = not set. */
export interface ChatExerciseParams {
  type: 'reps' | 'time';
  side: ChatExerciseSide;
  sets: number;
  reps: number;
  executionTime: number;
  restSets: number;
  restReps: number;
  preparationTime: number;
}

export type ChatExerciseSide = ExerciseSuggestionResponse['exerciseSide'];

const SIDES: readonly ChatExerciseSide[] = ['none', 'left', 'right', 'both', 'alternating'];

/** Canonical defaults, so a card without AI is complete too (DOMAIN_MODEL: Exercise). */
export const CHAT_EXERCISE_DEFAULTS: ChatExerciseParams = {
  type: 'reps',
  side: 'none',
  sets: EXERCISE_PARAM_DEFAULTS.sets,
  reps: EXERCISE_PARAM_DEFAULTS.reps,
  executionTime: 0,
  restSets: EXERCISE_PARAM_DEFAULTS.restSets,
  restReps: EXERCISE_PARAM_DEFAULTS.restReps,
  preparationTime: EXERCISE_PARAM_DEFAULTS.preparationTime,
};

/**
 * AI proposal for the card's parameters. Only values the AI gave replace the defaults; the therapist
 * still sees and saves them. A time exercise holds for `duration` seconds once per set.
 */
export function paramsFromSuggestion(
  suggestion: Pick<
    ExerciseSuggestionResponse,
    'type' | 'exerciseSide' | 'sets' | 'reps' | 'duration' | 'restSets' | 'advancedParams'
  >,
  base: ChatExerciseParams = CHAT_EXERCISE_DEFAULTS
): ChatExerciseParams {
  const executionTime = aiSuggestionExecutionTime(suggestion) ?? base.executionTime;
  const type = resolveChatExerciseType(suggestion.type === 'time' ? 'time' : 'reps', executionTime);

  return {
    type,
    side: SIDES.includes(suggestion.exerciseSide) ? suggestion.exerciseSide : base.side,
    sets: positiveAiNumber(suggestion.sets) ?? base.sets,
    reps: type === 'time' ? 1 : (positiveAiNumber(suggestion.reps) ?? base.reps),
    executionTime,
    restSets: positiveAiNumber(suggestion.restSets) ?? base.restSets,
    restReps: base.restReps,
    preparationTime: positiveAiNumber(suggestion.advancedParams?.preparationTime) ?? base.preparationTime,
  };
}

/** One item per line, as the therapist edits steps and cues in the card. */
export function linesToItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, '').trim())
    .filter(Boolean);
}

export function itemsToLines(items: readonly string[] | null | undefined): string {
  return (items ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * A time exercise needs a hold time, or the player cannot start it. Without one it is saved as reps.
 */
export function resolveChatExerciseType(proposedType: 'reps' | 'time', executionTime: number): 'reps' | 'time' {
  return proposedType === 'time' && executionTime > 0 ? 'time' : 'reps';
}

/**
 * Enrichment saved with the exercise: only the steps and cues the therapist saw and edited in the
 * card. Other AI sections (safety, mistakes, feelings) reach the patient, so they are not saved
 * unseen. Null when there is nothing to save.
 */
export function buildChatExerciseEnrichment(stepsText: string, cuesText: string): ExerciseEnrichmentData | null {
  const steps = linesToItems(stepsText);
  const cues = linesToItems(cuesText);
  if (steps.length === 0 && cues.length === 0) return null;
  return {
    $schema: ENRICHMENT_SCHEMA_V3,
    patient: { ...(steps.length > 0 ? { steps } : {}), ...(cues.length > 0 ? { cues } : {}) },
  };
}
