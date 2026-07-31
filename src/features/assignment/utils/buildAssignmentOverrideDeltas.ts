import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import {
  buildOverrideDelta,
  type InheritedBaseline,
  type PersonalizationPatch,
} from '@/components/shared/exercise/exercisePersonalizationWriter';
import type { ExerciseOverrideFields } from '@/components/shared/exercise/exerciseOverride';
import { hasExerciseOverrideContent } from '@/components/shared/exercise/exerciseOverride';
import { buildEnrichmentOverrideDelta } from '@/components/shared/exercise/enrichmentOverride';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/** Minimal exercise shape for override baseline (assignment Exercise or BuilderExercise). */
export interface OverrideBaselineExercise {
  id: string;
  name?: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number;
  defaultExecutionTime?: number;
  defaultRestBetweenSets?: number;
  defaultRestBetweenReps?: number;
  sets?: number;
  reps?: number;
  duration?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  notes?: string;
  side?: string;
  exerciseSide?: string;
  rangeOfMotion?: string;
  difficultyLevel?: string;
  patientDescription?: string;
  description?: string;
  clinicalDescription?: string;
  audioCue?: string;
  enrichmentData?: ExerciseEnrichmentData | null;
}

function exerciseToInheritedBaseline(exercise: OverrideBaselineExercise | undefined): InheritedBaseline {
  if (!exercise) return {};
  return {
    sets: exercise.defaultSets ?? exercise.sets,
    reps: exercise.defaultReps ?? exercise.reps,
    duration: exercise.defaultDuration ?? exercise.duration,
    executionTime: exercise.defaultExecutionTime,
    restSets: exercise.defaultRestBetweenSets ?? exercise.restSets,
    restReps: exercise.defaultRestBetweenReps ?? exercise.restReps,
    preparationTime: exercise.preparationTime,
    tempo: exercise.tempo,
    notes: exercise.notes,
    side: exercise.side ?? exercise.exerciseSide,
    exerciseSide: exercise.exerciseSide ?? exercise.side,
    rangeOfMotion: exercise.rangeOfMotion,
    difficultyLevel: exercise.difficultyLevel,
    patientDescription: exercise.patientDescription ?? exercise.description,
    clinicalDescription: exercise.clinicalDescription,
    audioCue: exercise.audioCue,
  };
}

/**
 * Build per-instance assignment override deltas for fields with
 * persistence: assignmentOverride (and any dosage deltas when desired ≠ template).
 * Keys are builder instanceIds (remap to mapping.id after addExerciseToSet).
 */
export function buildAssignmentOverrideDeltasFromBuilder(
  builderInstances: ExerciseInstance[],
  builderParams: Map<string, ExerciseParams>,
  availableExercises: OverrideBaselineExercise[]
): Record<string, ExerciseOverrideFields> {
  const result: Record<string, ExerciseOverrideFields> = {};

  for (const instance of builderInstances) {
    const params = builderParams.get(instance.instanceId);
    if (!params) continue;

    const exercise = availableExercises.find((item) => item.id === instance.exerciseId);
    const inherited = exerciseToInheritedBaseline(exercise);

    // Only route assignmentOverride-persistent fields into the JSON delta for create.
    // Dosage stays on mapping; compare clinical/classification fields against template.
    // Omit undefined so buildOverrideDelta treats them as "not touched".
    const clinicalDesired: PersonalizationPatch = {};
    if (params.exerciseSide !== undefined) {
      clinicalDesired.side = params.exerciseSide;
      clinicalDesired.exerciseSide = params.exerciseSide;
    }
    if (params.rangeOfMotion !== undefined) {
      clinicalDesired.rangeOfMotion = params.rangeOfMotion;
    }
    if (params.difficultyLevel !== undefined) {
      clinicalDesired.difficultyLevel = params.difficultyLevel;
    }
    if (params.patientDescription !== undefined) {
      clinicalDesired.patientDescription = params.patientDescription;
    }
    if (params.clinicalDescription !== undefined) {
      clinicalDesired.clinicalDescription = params.clinicalDescription;
    }
    if (params.audioCue !== undefined) {
      clinicalDesired.audioCue = params.audioCue;
    }
    if (params.customImages !== undefined) {
      clinicalDesired.customImages = params.customImages;
    }

    const delta = buildOverrideDelta(inherited, clinicalDesired);
    const enrichmentDelta = buildEnrichmentOverrideDelta(
      exercise?.enrichmentData,
      params.enrichment
    );
    if (enrichmentDelta) {
      delta.enrichment = enrichmentDelta;
    }
    if (hasExerciseOverrideContent(delta)) {
      result[instance.instanceId] = delta;
    }
  }

  return result;
}

/**
 * Remap instanceId-keyed deltas onto real mapping IDs after addExerciseToSet.
 */
export function remapOverrideDeltasToMappingIds(
  deltasByInstanceId: Record<string, ExerciseOverrideFields>,
  instanceIdToMappingId: Map<string, string>
): Record<string, ExerciseOverrideFields> {
  const remapped: Record<string, ExerciseOverrideFields> = {};
  for (const [instanceId, delta] of Object.entries(deltasByInstanceId)) {
    const mappingId = instanceIdToMappingId.get(instanceId);
    if (!mappingId) continue;
    remapped[mappingId] = delta;
  }
  return remapped;
}

export function stringifyAssignmentOverrides(
  overridesByMappingId: Record<string, ExerciseOverrideFields>
): string | null {
  if (Object.keys(overridesByMappingId).length === 0) return null;
  return JSON.stringify(overridesByMappingId);
}
