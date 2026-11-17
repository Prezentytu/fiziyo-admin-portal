import { EXERCISE_PARAM_DEFAULTS } from '@/components/shared/exercise/exerciseParamDefaults';
import type { EnrichmentPatientMistakeV3, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import type { ExerciseSuggestionResponse } from '@/types/ai.types';
import { aiSuggestionExecutionTime, positiveAiNumber } from '@/features/exercises/utils/aiSuggestionParams';
import { ENRICHMENT_SCHEMA_V3, toV3 } from '@/features/verification/utils/enrichmentToV3';

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

const SIDE_SUMMARY: Record<ChatExerciseSide, string> = {
  none: '',
  left: 'tylko lewa',
  right: 'tylko prawa',
  both: 'na każdą stronę',
  alternating: 'naprzemiennie',
};

/** The card's parameters in one line, as the set draft shows them: „3 × 30 s · przerwa 30 s · …”. */
export function formatChatParams(params: Omit<ChatExerciseParams, 'type'>, type: ChatExerciseParams['type']): string {
  const held = type === 'time' && params.executionTime > 0;
  const parts = [
    held ? `${params.sets} × ${params.executionTime} s` : `${params.sets} × ${params.reps}`,
    !held && params.executionTime > 0 ? `${params.executionTime} s powtórzenie` : '',
    params.restSets > 0 ? `przerwa ${params.restSets} s` : '',
    params.preparationTime > 0 ? `przygotowanie ${params.preparationTime} s` : '',
    SIDE_SUMMARY[params.side] ?? '',
  ];
  return parts.filter(Boolean).join(' · ');
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

/** One mistake per line, written as „błąd → poprawka” in the card. */
export function mistakesToLines(mistakes: readonly EnrichmentPatientMistakeV3[] | null | undefined): string {
  return (mistakes ?? [])
    .map((item) => [item.mistake?.trim(), item.fix?.trim()].filter(Boolean).join(' → '))
    .filter(Boolean)
    .join('\n');
}

export function linesToMistakes(text: string): EnrichmentPatientMistakeV3[] {
  return linesToItems(text).map((line) => {
    const [mistake, ...fix] = line.split(/\s*(?:→|->)\s*/);
    const fixText = fix.join(' ').trim();
    return fixText ? { mistake: mistake.trim(), fix: fixText } : { mistake: mistake.trim() };
  });
}

/** What the AI enrichment gives each section of the card; empty strings where it gave nothing. */
export interface ChatExerciseTexts {
  description: string;
  steps: string;
  cues: string;
  mistakes: string;
  stopIf: string;
}

export function textsFromEnrichment(enrichment: ExerciseEnrichmentData | null | undefined): ChatExerciseTexts {
  const v3 = toV3(enrichment);
  return {
    description: v3.patient?.summary?.trim() ?? '',
    steps: itemsToLines(v3.patient?.steps),
    cues: itemsToLines(v3.patient?.cues),
    mistakes: mistakesToLines(v3.patient?.mistakes),
    stopIf: v3.safety?.stop_if?.trim() ?? '',
  };
}

/**
 * Enrichment saved with the exercise: only what the therapist saw and could edit in the card
 * (steps, cues, mistakes, when to stop). Other AI sections reach the patient, so they are not
 * saved unseen. Null when there is nothing to save.
 */
export function buildChatExerciseEnrichment(
  texts: Pick<ChatExerciseTexts, 'steps' | 'cues'> & Partial<Pick<ChatExerciseTexts, 'mistakes' | 'stopIf'>>
): ExerciseEnrichmentData | null {
  const steps = linesToItems(texts.steps);
  const cues = linesToItems(texts.cues);
  const mistakes = linesToMistakes(texts.mistakes ?? '');
  const stopIf = texts.stopIf?.trim() ?? '';
  const patient = {
    ...(steps.length > 0 ? { steps } : {}),
    ...(cues.length > 0 ? { cues } : {}),
    ...(mistakes.length > 0 ? { mistakes } : {}),
  };
  if (Object.keys(patient).length === 0 && !stopIf) return null;
  return {
    $schema: ENRICHMENT_SCHEMA_V3,
    ...(Object.keys(patient).length > 0 ? { patient } : {}),
    ...(stopIf ? { safety: { stop_if: stopIf } } : {}),
  };
}
