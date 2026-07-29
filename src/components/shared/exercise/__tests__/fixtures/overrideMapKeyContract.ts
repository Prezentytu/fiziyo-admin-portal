/**
 * Cross-repo contract fixtures for exerciseOverrides map keys.
 * Mirror expectations live in fizjo-app:
 * `src/graphql/hooks/__tests__/usePatientAssignments.test.ts`
 * ("override map key contract").
 */

export const OVERRIDE_MAP_KEY_CONTRACT = {
  /** Admin / backend always key exerciseOverrides by ExerciseSetMapping.id */
  canonicalKeyField: 'mappingId' as const,
  /** Mobile transform may keep exercise.id on `id` for UI compat */
  legacyMobileKeyField: 'id' as const,
  sample: {
    mappingId: 'mapping-1',
    exerciseId: 'exercise-1',
    adminWrittenOverrides: {
      'mapping-1': { sets: 5, reps: 12, executionTime: 4 },
    },
    legacyMobileWrittenOverrides: {
      'exercise-1': { sets: 7, hidden: true },
    },
  },
  resolveOrder: ['mappingId', '_id', 'id', 'exerciseId'] as const,
};
