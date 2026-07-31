export type ExerciseLoadSource = 'manual' | 'converted' | 'unknown';

export interface ExerciseLoadMutationVars {
  loadWeightKg: number | null;
  loadSource: ExerciseLoadSource | null;
  loadType: string | null;
  loadValue: number | null;
  loadUnit: string | null;
  loadText: string | null;
}

export interface ExerciseLoadParamFields {
  loadWeightKg?: number;
  loadSource?: string;
  loadType?: string;
  loadValue?: number;
  loadUnit?: string;
  loadText?: string;
}

/**
 * Dual-write payload for GraphQL load args (SPEC-003 kg-only + legacy).
 */
export function buildExerciseLoadMutationVars(loadKg: number | null | undefined): ExerciseLoadMutationVars {
  if (loadKg == null || Number.isNaN(loadKg)) {
    return {
      loadWeightKg: null,
      loadSource: null,
      loadType: null,
      loadValue: null,
      loadUnit: null,
      loadText: null,
    };
  }

  return {
    loadWeightKg: loadKg,
    loadSource: 'manual',
    loadType: 'weight',
    loadValue: loadKg,
    loadUnit: 'kg',
    loadText: `${loadKg} kg`,
  };
}

/**
 * Maps UI loadKg patch into builder/param state fields.
 */
export function buildExerciseLoadParamFields(loadKg: number | null | undefined): ExerciseLoadParamFields {
  const vars = buildExerciseLoadMutationVars(loadKg);
  if (vars.loadWeightKg == null) {
    return {
      loadWeightKg: undefined,
      loadSource: undefined,
      loadType: undefined,
      loadValue: undefined,
      loadUnit: undefined,
      loadText: undefined,
    };
  }

  return {
    loadWeightKg: vars.loadWeightKg,
    loadSource: vars.loadSource ?? undefined,
    loadType: vars.loadType ?? undefined,
    loadValue: vars.loadValue ?? undefined,
    loadUnit: vars.loadUnit ?? undefined,
    loadText: vars.loadText ?? undefined,
  };
}

/**
 * Dual-read: prefer loadWeightKg, fall back to legacy weight+kg.
 */
export function resolveLoadKg(load?: {
  loadWeightKg?: number | null;
  value?: number | null;
  unit?: string | null;
} | null): number | undefined {
  if (load?.loadWeightKg != null && !Number.isNaN(load.loadWeightKg)) {
    return load.loadWeightKg;
  }

  if (load?.value != null && !Number.isNaN(load.value) && load.unit?.toLowerCase() === 'kg') {
    return load.value;
  }

  return undefined;
}
