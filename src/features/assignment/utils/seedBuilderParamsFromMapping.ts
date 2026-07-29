import type { ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import { parseMappingOverridesJson } from '@/components/shared/exercise/mappingOverrides';
import { applyEnrichmentOverride } from '@/components/shared/exercise/enrichmentOverride';
import type { ExerciseMapping } from '../types';

/**
 * Seed Assignment Wizard / set-builder params from a source mapping,
 * including template-set overridesJson (SPEC-023 / SPEC-024).
 */
export function seedBuilderParamsFromMapping(mapping: ExerciseMapping): ExerciseParams {
  const mappingOverrides = parseMappingOverridesJson(mapping.overridesJson);
  const exercise = mapping.exercise;

  return {
    sets: mapping.sets ?? undefined,
    reps: mapping.reps ?? undefined,
    duration: mapping.duration ?? undefined,
    restSets: mapping.restSets ?? undefined,
    restReps: mapping.restReps ?? undefined,
    executionTime: mapping.executionTime ?? undefined,
    preparationTime: mapping.preparationTime ?? undefined,
    tempo: mapping.tempo ?? '',
    load: mapping.load ?? undefined,
    notes: mapping.notes ?? '',
    customName: mapping.customName ?? '',
    customDescription: mapping.customDescription ?? '',
    exerciseSide:
      mappingOverrides.exerciseSide ??
      exercise?.side ??
      exercise?.exerciseSide ??
      undefined,
    rangeOfMotion: mappingOverrides.rangeOfMotion ?? exercise?.rangeOfMotion ?? undefined,
    difficultyLevel:
      mappingOverrides.difficultyLevel ?? exercise?.difficultyLevel ?? undefined,
    patientDescription:
      mappingOverrides.patientDescription ??
      exercise?.patientDescription ??
      undefined,
    clinicalDescription:
      mappingOverrides.clinicalDescription ?? exercise?.clinicalDescription ?? undefined,
    audioCue: mappingOverrides.audioCue ?? exercise?.audioCue ?? undefined,
    enrichment: applyEnrichmentOverride(exercise?.enrichmentData, mappingOverrides.enrichment),
  };
}
