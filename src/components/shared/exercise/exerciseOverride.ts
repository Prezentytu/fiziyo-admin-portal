/**
 * Canonical JSON keys for patient / assignment exerciseOverrides (SPEC-012).
 * Map key is mapping.id; values use these field names — never fieldContract keys
 * like `side` / `load` at the JSON boundary.
 */

export interface ExerciseOverrideFields {
  sets?: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  /** kg-only load (SPEC-003 / SPEC-012). */
  loadWeightKg?: number;
  rangeOfMotion?: string;
  customName?: string;
  customDescription?: string;
  notes?: string;
  /** Lowercase side value (none|left|right|both|alternating). */
  exerciseSide?: string;
  /** UPPER difficulty enum (UNKNOWN|EASY|MEDIUM|HARD|EXPERT). */
  difficultyLevel?: string;
  /** Patient-facing description override (SPEC-021). */
  patientDescription?: string;
  /** Clinical notes override (SPEC-021). */
  clinicalDescription?: string;
  /** Audio cue override (SPEC-021). */
  audioCue?: string;
  customImages?: string[];
  hidden?: boolean;
  /**
   * Legacy in-memory assignment shape. Prefer loadWeightKg.
   * resolveEffectiveExerciseParams still dual-reads this.
   */
  load?: {
    loadWeightKg?: number | null;
    type?: string;
    value?: number;
    unit?: string;
    text?: string;
  };
}

/** Override keyed by mapping id in Assignment Wizard state. */
export interface AssignmentExerciseOverride extends ExerciseOverrideFields {
  exerciseMappingId: string;
}

/** Keys that count as a meaningful patient customization (badge / dirty). */
export const EXERCISE_OVERRIDE_CONTENT_KEYS = [
  'sets',
  'reps',
  'duration',
  'executionTime',
  'restSets',
  'restReps',
  'preparationTime',
  'tempo',
  'loadWeightKg',
  'rangeOfMotion',
  'customName',
  'customDescription',
  'notes',
  'exerciseSide',
  'difficultyLevel',
  'patientDescription',
  'clinicalDescription',
  'audioCue',
  'customImages',
  'hidden',
  'load',
] as const satisfies ReadonlyArray<keyof ExerciseOverrideFields>;

export function hasExerciseOverrideContent(override?: ExerciseOverrideFields | null): boolean {
  if (!override) return false;
  for (const key of EXERCISE_OVERRIDE_CONTENT_KEYS) {
    const value = override[key];
    if (value === undefined) continue;
    if (key === 'customImages' && Array.isArray(value) && value.length === 0) continue;
    if (key === 'hidden' && value === false) continue;
    return true;
  }
  return false;
}

export function listOverriddenFieldKeys(override?: ExerciseOverrideFields | null): string[] {
  if (!override) return [];
  return EXERCISE_OVERRIDE_CONTENT_KEYS.filter((key) => {
    const value = override[key];
    if (value === undefined) return false;
    if (key === 'customImages' && Array.isArray(value) && value.length === 0) return false;
    if (key === 'hidden' && value === false) return false;
    return true;
  });
}
