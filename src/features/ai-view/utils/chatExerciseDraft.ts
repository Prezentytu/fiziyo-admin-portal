import { EXERCISE_PARAM_DEFAULTS } from '@/components/shared/exercise/exerciseParamDefaults';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import type { ExerciseSuggestionResponse } from '@/types/ai.types';
import { ENRICHMENT_SCHEMA_V3 } from '@/features/verification/utils/enrichmentToV3';

/** Parameters of a new exercise in the chat card. Times in seconds; 0 = not set. */
export interface ChatExerciseParams {
  type: 'reps' | 'time';
  sets: number;
  reps: number;
  executionTime: number;
  restSets: number;
  restReps: number;
  preparationTime: number;
}

/** Canonical defaults, so a card without AI is complete too (DOMAIN_MODEL: Exercise). */
export const CHAT_EXERCISE_DEFAULTS: ChatExerciseParams = {
  type: 'reps',
  sets: EXERCISE_PARAM_DEFAULTS.sets,
  reps: EXERCISE_PARAM_DEFAULTS.reps,
  executionTime: 0,
  restSets: EXERCISE_PARAM_DEFAULTS.restSets,
  restReps: EXERCISE_PARAM_DEFAULTS.restReps,
  preparationTime: EXERCISE_PARAM_DEFAULTS.preparationTime,
};

function positive(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

/**
 * AI proposal for the card's parameters. Only values the AI gave replace the defaults; the therapist
 * still sees and saves them. A time exercise holds for `duration` seconds once per set.
 */
export function paramsFromSuggestion(
  suggestion: Pick<ExerciseSuggestionResponse, 'type' | 'sets' | 'reps' | 'duration' | 'restSets' | 'advancedParams'>,
  base: ChatExerciseParams = CHAT_EXERCISE_DEFAULTS
): ChatExerciseParams {
  const type = suggestion.type === 'time' ? 'time' : 'reps';
  const holdSeconds = positive(suggestion.duration);
  const executionTime =
    positive(suggestion.advancedParams?.executionTime) ?? (type === 'time' ? holdSeconds : null) ?? base.executionTime;

  return {
    type,
    sets: positive(suggestion.sets) ?? base.sets,
    reps: type === 'time' ? 1 : (positive(suggestion.reps) ?? base.reps),
    executionTime,
    restSets: positive(suggestion.restSets) ?? base.restSets,
    restReps: base.restReps,
    preparationTime: positive(suggestion.advancedParams?.preparationTime) ?? base.preparationTime,
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
 * Enrichment saved with the exercise: the AI proposal (v3) with the steps and cues the therapist
 * edited in the card. Null when there is nothing to save.
 */
export function buildChatExerciseEnrichment(
  aiProposal: ExerciseEnrichmentData | null,
  stepsText: string,
  cuesText: string
): ExerciseEnrichmentData | null {
  const steps = linesToItems(stepsText);
  const cues = linesToItems(cuesText);
  const { steps: _aiSteps, cues: _aiCues, cue_phases: _aiCuePhases, ...patientRest } = aiProposal?.patient ?? {};
  const patient = {
    ...patientRest,
    ...(steps.length > 0 ? { steps } : {}),
    ...(cues.length > 0 ? { cues } : {}),
  };
  const result: ExerciseEnrichmentData = {
    ...(aiProposal ?? {}),
    ...(Object.keys(patient).length > 0 ? { patient } : {}),
  };
  if (Object.keys(patient).length === 0) delete result.patient;
  const hasContent = Object.keys(result).some((key) => key !== '$schema');
  return hasContent ? { ...result, $schema: aiProposal?.$schema ?? ENRICHMENT_SCHEMA_V3 } : null;
}
