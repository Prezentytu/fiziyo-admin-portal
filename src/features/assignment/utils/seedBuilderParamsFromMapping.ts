import type { ExerciseInstance, ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import type { ExerciseOverrideFields } from '@/components/shared/exercise/exerciseOverride';
import { parseMappingOverridesJson } from '@/components/shared/exercise/mappingOverrides';
import { applyEnrichmentOverride, mergeEnrichmentOverrides } from '@/components/shared/exercise/enrichmentOverride';
import { resolveEffectiveExerciseParams } from '@/components/shared/exercise/resolveEffectiveExerciseParams';
import { parseOverrideMap } from '@/components/shared/exercise/exercisePersonalizationWriter';
import type { ExerciseMapping } from '../types';
import { sortMappingsByOrder } from './sortMappingsByOrder';

function seedClearable(mappingValue: string | null | undefined, templateValue: string | null | undefined): string | undefined {
  if (mappingValue === null) return '';
  return mappingValue ?? templateValue ?? undefined;
}

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
  const mappingOverrides = parseMappingOverridesJson(mapping.overridesJson);
  const exercise = mapping.exercise;
  // Without the exercise's own content, a blank template plus override would read as "clear the rest".
  const contentSeed =
    exercise?.enrichmentData === undefined
      ? {
          enrichment: undefined,
          enrichmentOverride: mergeEnrichmentOverrides(mappingOverrides.enrichment, assignmentOverride?.enrichment),
        }
      : null;

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
      resistance: effective.resistance ?? undefined,
      equipment: effective.equipment ?? undefined,
      difficultyLevel: effective.difficultyLevel ?? undefined,
      patientDescription: effective.patientDescription ?? undefined,
      clinicalDescription: effective.clinicalDescription ?? undefined,
      audioCue: effective.audioCue ?? undefined,
      customImages: effective.customImages,
      ...(contentSeed ?? { enrichment: effective.effectiveEnrichment }),
    };
  }

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
    // null = wyczyszczone w pozycji; '' w builderze zapisze się z powrotem jako null, a nie wróci z katalogu.
    rangeOfMotion: seedClearable(mappingOverrides.rangeOfMotion, exercise?.rangeOfMotion),
    resistance: mappingOverrides.resistance ?? exercise?.resistance ?? undefined,
    equipment: mappingOverrides.equipment ?? exercise?.equipment ?? undefined,
    difficultyLevel: seedClearable(mappingOverrides.difficultyLevel, exercise?.difficultyLevel),
    patientDescription: seedClearable(mappingOverrides.patientDescription, exercise?.patientDescription),
    clinicalDescription: seedClearable(mappingOverrides.clinicalDescription, exercise?.clinicalDescription),
    audioCue: seedClearable(mappingOverrides.audioCue, exercise?.audioCue),
    ...(contentSeed ?? { enrichment: applyEnrichmentOverride(exercise?.enrichmentData, mappingOverrides.enrichment) }),
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

interface BuilderState {
  mappings: ExerciseMapping[];
  instances: ExerciseInstance[];
  params: Map<string, ExerciseParams>;
}

/** Seeds the builder from a source set in saved order; `mappings` is the same sorted copy. */
export function buildBuilderStateFromMappings(mappings: readonly ExerciseMapping[] | null | undefined): BuilderState {
  const sortedMappings = sortMappingsByOrder(mappings);
  const instances: ExerciseInstance[] = [];
  const params = new Map<string, ExerciseParams>();

  sortedMappings.forEach((mapping) => {
    const instanceId = `existing-${mapping.id}`;
    instances.push({ instanceId, exerciseId: mapping.exerciseId });
    params.set(instanceId, seedBuilderParamsFromMapping(mapping));
  });

  return { mappings: sortedMappings, instances, params };
}
