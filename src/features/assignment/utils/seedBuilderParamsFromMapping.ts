import type { ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import type { ExerciseOverrideFields } from '@/components/shared/exercise/exerciseOverride';
import { parseMappingOverridesJson } from '@/components/shared/exercise/mappingOverrides';
import { applyEnrichmentOverride } from '@/components/shared/exercise/enrichmentOverride';
import { resolveEffectiveExerciseParams } from '@/components/shared/exercise/resolveEffectiveExerciseParams';
import { parseOverrideMap } from '@/components/shared/exercise/exercisePersonalizationWriter';
import type { ExerciseMapping } from '../types';

/**
 * Seed Assignment Wizard / set-builder params from a source mapping,
 * including template-set overridesJson (SPEC-023 / SPEC-024).
 * When `assignmentOverride` is provided (edit mode), precedence is
 * override > mapping.overridesJson > mapping columns > template.
 */
export function seedBuilderParamsFromMapping(
  mapping: ExerciseMapping,
  assignmentOverride?: ExerciseOverrideFields | null
): ExerciseParams {
  if (assignmentOverride) {
    const effective = resolveEffectiveExerciseParams(mapping, assignmentOverride);
    return {
      sets: effective.sets,
      reps: effective.reps,
      duration: effective.duration,
      restSets: effective.restSets,
      restReps: effective.restReps,
      executionTime: effective.executionTime,
      preparationTime: effective.preparationTime,
      tempo: effective.tempo ?? '',
      load:
        effective.loadKg != null
          ? {
              loadWeightKg: effective.loadKg,
              loadSource: 'manual',
              type: 'weight',
              value: effective.loadKg,
              unit: 'kg',
              text: `${effective.loadKg} kg`,
            }
          : (mapping.load ?? undefined),
      loadWeightKg: effective.loadKg ?? undefined,
      notes: effective.notes ?? '',
      customName: effective.customName ?? '',
      customDescription: effective.customDescription ?? '',
      exerciseSide: effective.side,
      rangeOfMotion: effective.rangeOfMotion ?? undefined,
      difficultyLevel: effective.difficultyLevel ?? undefined,
      patientDescription: effective.patientDescription ?? undefined,
      clinicalDescription: effective.clinicalDescription ?? undefined,
      audioCue: effective.audioCue ?? undefined,
      customImages: effective.customImages,
      enrichment: effective.effectiveEnrichment,
    };
  }

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

/** Parse assignment.exerciseOverrides and return entry for mapping.id. */
export function getAssignmentOverrideForMapping(
  exerciseOverridesJson: string | null | undefined,
  mappingId: string
): ExerciseOverrideFields | undefined {
  const map = parseOverrideMap(exerciseOverridesJson);
  return map[mappingId];
}
