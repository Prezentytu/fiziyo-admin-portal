import { z } from 'zod';
import type { RewardAssignment } from '@/graphql/types';

const badgeNames: Record<string, string> = {
  Persistence: 'Za wytrwałość',
  Technique: 'Za technikę',
  Comeback: 'Za powrót po przerwie',
  Courage: 'Za odwagę',
};
export const badgeLabel = (key: string) => badgeNames[key] ?? 'Odznaka uznania';
export const rewardDate = (date: string) =>
  new Date(date).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });

const mappingOverride = z.object({ hidden: z.unknown().optional(), customName: z.string().optional() });
const extraExercise = z.object({
  exerciseId: z.string().min(1),
  customName: z.string().optional(),
  exerciseName: z.string().optional(),
});

function readOverrides(raw: string | null): Record<string, unknown> {
  try {
    const parsed = z.record(z.string(), z.unknown()).safeParse(JSON.parse(raw ?? '{}'));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function rewardExerciseOptions(assignments: RewardAssignment[]) {
  const exercises = new Map<string, string>();
  for (const assignment of assignments) {
    const overrides = readOverrides(assignment.exerciseOverrides);
    if (assignment.exercise) exercises.set(assignment.exercise.id, assignment.exercise.name);
    for (const mapping of assignment.exerciseSet?.exerciseMappings ?? []) {
      if (!mapping.exercise) continue;
      const override = mappingOverride.safeParse(overrides[mapping.id] ?? overrides[mapping.exercise.id]).data;
      if (!override?.hidden)
        exercises.set(mapping.exercise.id, override?.customName || mapping.customName || mapping.exercise.name);
    }
    const additional = overrides.__additionalExercises__;
    if (!Array.isArray(additional)) continue;
    for (const value of additional) {
      const exercise = extraExercise.safeParse(value).data;
      if (exercise)
        exercises.set(exercise.exerciseId, exercise.customName || exercise.exerciseName || 'Ćwiczenie dodatkowe');
    }
  }
  return Array.from(exercises, ([id, name]) => ({ id, name }));
}
