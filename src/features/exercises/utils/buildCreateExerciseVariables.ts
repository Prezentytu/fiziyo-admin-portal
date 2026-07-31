import type { CreateExerciseVariables, DifficultyLevel, ExerciseScope } from '@/graphql/types/exercise.types';
import { buildExerciseLoadMutationVars } from '@/utils/exerciseLoadMutation';
import { inferExerciseType } from './inferExerciseType';

export interface CreateExerciseDraft {
  name: string;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
  notes?: string | null;
  audioCue?: string | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  side?: string | null;
  exerciseSide?: string | null;
  difficultyLevel?: string | null;
  videoUrl?: string | null;
  sets?: number | null;
  reps?: number | null;
  executionTime?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  duration?: number | null;
  loadKg?: number | null;
  mainTags?: string[] | null;
  additionalTags?: string[] | null;
  images?: string[] | null;
  gifUrl?: string | null;
  imageUrl?: string | null;
  exerciseSetId?: string | null;
}

interface BuildCreateExerciseVariablesInput {
  organizationId: string;
  draft: CreateExerciseDraft;
  scope?: ExerciseScope;
  isActive?: boolean;
}

function asText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeSide(side: string | null | undefined): string | null {
  if (side == null || side === '' || side === 'none' || side.toUpperCase() === 'NONE') {
    return null;
  }
  return side;
}

function normalizeDifficulty(level: string | null | undefined): DifficultyLevel | null {
  if (level == null || level === '' || level.toUpperCase() === 'UNKNOWN') {
    return null;
  }
  return level.toUpperCase() as DifficultyLevel;
}

function normalizeTags(tags: string[] | null | undefined): string[] | null {
  if (!tags || tags.length === 0) return null;
  return tags;
}

/**
 * Jedyny write-path create → CREATE_EXERCISE_MUTATION.
 * Używany przez CreateExerciseWizard i duplikację na detalu.
 */
export function buildCreateExerciseVariables({
  organizationId,
  draft,
  scope = 'ORGANIZATION',
  isActive = true,
}: BuildCreateExerciseVariablesInput): CreateExerciseVariables {
  const description = (draft.patientDescription ?? draft.description ?? '').trim();
  const side = draft.side ?? draft.exerciseSide;
  const loadKg =
    draft.loadKg != null && !Number.isNaN(draft.loadKg) && draft.loadKg > 0 ? draft.loadKg : null;

  return {
    organizationId,
    scope,
    name: draft.name.trim(),
    description,
    type: inferExerciseType(draft.executionTime),
    sets: draft.sets ?? null,
    reps: draft.reps ?? null,
    duration: draft.duration ?? null,
    restSets: draft.restSets ?? null,
    restReps: draft.restReps ?? null,
    preparationTime: draft.preparationTime ?? null,
    executionTime: draft.executionTime ?? null,
    videoUrl: asText(draft.videoUrl),
    gifUrl: draft.gifUrl ?? null,
    imageUrl: draft.imageUrl ?? null,
    images: draft.images?.length ? draft.images : null,
    notes: asText(draft.notes),
    exerciseSetId: draft.exerciseSetId ?? null,
    isActive,
    exerciseSide: normalizeSide(side),
    mainTags: normalizeTags(draft.mainTags),
    additionalTags: normalizeTags(draft.additionalTags),
    tempo: asText(draft.tempo),
    clinicalDescription: asText(draft.clinicalDescription),
    audioCue: asText(draft.audioCue),
    difficultyLevel: normalizeDifficulty(draft.difficultyLevel),
    rangeOfMotion: asText(draft.rangeOfMotion),
    ...buildExerciseLoadMutationVars(loadKg),
  };
}
