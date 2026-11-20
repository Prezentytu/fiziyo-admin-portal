import type { CreateExerciseVariables, DifficultyLevel, ExerciseScope } from '@/graphql/types/exercise.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { buildExerciseLoadMutationVars } from '@/utils/exerciseLoadMutation';
import { normalizeExerciseType } from '@/utils/exerciseEnums';
import { getExerciseVideos } from '@/utils/exerciseVideos';
import { inferExerciseType } from './inferExerciseType';
import { toNewExerciseV33 } from './newExerciseV33';

export interface CreateExerciseDraft {
  name: string;
  /** Zapisany typ (np. duplikacja istniejącego ćwiczenia). Pusty tylko dla szkicu z kreatora. */
  type?: string | null;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
  notes?: string | null;
  audioCue?: string | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  resistance?: string | null;
  equipment?: string | null;
  side?: string | null;
  exerciseSide?: string | null;
  difficultyLevel?: string | null;
  videoUrl?: string | null;
  videos?: string[] | null;
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
  /** Kroki, wskazówki i reszta treści v3 zapisane od razu przy tworzeniu (np. propozycja AI z czatu). */
  enrichmentData?: ExerciseEnrichmentData | null;
}

interface BuildCreateExerciseVariablesInput {
  organizationId: string;
  draft: CreateExerciseDraft;
  scope?: ExerciseScope;
  isActive?: boolean;
  /**
   * `v33` (domyślnie): nowe ćwiczenie od razu w v3.3 (D-11), treść starych pól w dokumencie.
   * `source`: kopia istniejącego rekordu zostaje w jego wersji (duplikacja).
   */
  schema?: 'v33' | 'source';
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
 * Typ: zapisany `draft.type` wygrywa; zgadywanie z `executionTime` tylko dla szkicu bez typu.
 */
export function buildCreateExerciseVariables({
  organizationId,
  draft: input,
  scope = 'ORGANIZATION',
  isActive = true,
  schema = 'v33',
}: BuildCreateExerciseVariablesInput): CreateExerciseVariables {
  const newRecord = schema === 'v33' ? toNewExerciseV33(input, input.enrichmentData) : null;
  const draft = newRecord?.draft ?? input;
  const enrichmentData = newRecord?.document ?? input.enrichmentData;
  const description = (draft.patientDescription ?? draft.description ?? '').trim();
  const side = draft.side ?? draft.exerciseSide;
  const loadKg = draft.loadKg != null && !Number.isNaN(draft.loadKg) && draft.loadKg > 0 ? draft.loadKg : null;

  return {
    organizationId,
    scope,
    name: draft.name.trim(),
    description,
    type: normalizeExerciseType(draft.type) ?? inferExerciseType(draft.executionTime),
    sets: draft.sets ?? null,
    reps: draft.reps ?? null,
    duration: draft.duration ?? null,
    restSets: draft.restSets ?? null,
    restReps: draft.restReps ?? null,
    preparationTime: draft.preparationTime ?? null,
    executionTime: draft.executionTime ?? null,
    // The backend sets `videoUrl` from the first entry, so the list alone is sent.
    videos: getExerciseVideos(draft),
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
    resistance: asText(draft.resistance),
    equipment: asText(draft.equipment),
    enrichmentDataJson: enrichmentData ? JSON.stringify(enrichmentData) : null,
    ...buildExerciseLoadMutationVars(loadKg),
  };
}
