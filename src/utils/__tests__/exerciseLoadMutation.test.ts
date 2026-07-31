import { describe, expect, it } from 'vitest';
import {
  buildExerciseLoadMutationVars,
  buildExerciseLoadParamFields,
  resolveLoadKg,
} from '@/utils/exerciseLoadMutation';

describe('exerciseLoadMutation', () => {
  it('builds dual-write payload for kg value', () => {
    expect(buildExerciseLoadMutationVars(60)).toEqual({
      loadWeightKg: 60,
      loadSource: 'manual',
      loadType: 'weight',
      loadValue: 60,
      loadUnit: 'kg',
      loadText: '60 kg',
    });
  });

  it('clears all fields when loadKg is null', () => {
    expect(buildExerciseLoadMutationVars(null)).toEqual({
      loadWeightKg: null,
      loadSource: null,
      loadType: null,
      loadValue: null,
      loadUnit: null,
      loadText: null,
    });
  });

  it('maps param fields for builder state', () => {
    expect(buildExerciseLoadParamFields(2.5)).toEqual({
      loadWeightKg: 2.5,
      loadSource: 'manual',
      loadType: 'weight',
      loadValue: 2.5,
      loadUnit: 'kg',
      loadText: '2.5 kg',
    });
  });

  it('prefers loadWeightKg over legacy value', () => {
    expect(resolveLoadKg({ loadWeightKg: 12, value: 99, unit: 'kg' })).toBe(12);
  });

  it('falls back to legacy weight+kg', () => {
    expect(resolveLoadKg({ value: 8, unit: 'kg' })).toBe(8);
    expect(resolveLoadKg({ value: 8, unit: 'lbs' })).toBeUndefined();
  });
});
