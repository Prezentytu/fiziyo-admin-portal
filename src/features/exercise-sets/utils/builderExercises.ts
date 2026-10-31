import type { BuilderExercise } from '@/components/shared/ExerciseSetBuilder';
import { mapExercisesWithTags, type ExerciseTag } from '@/utils/tagUtils';

type RawPickerExercise = Record<string, unknown> & { id: string; name: string };

/**
 * Picker records → builder exercises, keeping every field the defaults and override deltas read
 * (enrichmentData, clinicalDescription, defaultLoad...). Inactive exercises are not offered.
 */
export function toBuilderExercises(rawExercises: readonly RawPickerExercise[], tagsMap: Map<string, ExerciseTag>) {
  const builderExercises = rawExercises
    .filter((raw) => raw.isActive !== false)
    .map((raw) => {
      const patientDescription = (raw.patientDescription ?? raw.description) as string | undefined;
      const side = raw.side as string | undefined;
      return {
        ...raw,
        patientDescription,
        description: patientDescription,
        exerciseSide: side?.toLowerCase() ?? (raw.exerciseSide as string | undefined),
      } as BuilderExercise;
    });
  return mapExercisesWithTags(builderExercises, tagsMap);
}

/** How many sets use each exercise ("Popularne" section of the builder). */
export function countExerciseUsage(
  sets: ReadonlyArray<{ exerciseMappings?: ReadonlyArray<{ exerciseId?: string | null }> | null }>
): Record<string, number> {
  const usage: Record<string, number> = {};
  for (const set of sets) {
    for (const mapping of set.exerciseMappings ?? []) {
      if (mapping.exerciseId) usage[mapping.exerciseId] = (usage[mapping.exerciseId] ?? 0) + 1;
    }
  }
  return usage;
}
