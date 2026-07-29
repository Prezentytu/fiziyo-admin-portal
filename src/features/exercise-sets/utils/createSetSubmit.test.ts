import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_TEMPLATE_SET_FREQUENCY,
  buildAddExerciseToSetVariables,
  buildCreateTemplateSetVariables,
  submitCreateTemplateSet,
} from './createSetSubmit';

describe('createSetSubmit', () => {
  it('builds create variables with TEMPLATE classification and default frequency', () => {
    expect(
      buildCreateTemplateSetVariables({
        organizationId: 'org-1',
        name: '  Rehabilitacja kolana  ',
        description: '  opis  ',
      })
    ).toEqual({
      organizationId: 'org-1',
      name: 'Rehabilitacja kolana',
      description: 'opis',
      kind: 'TEMPLATE',
      templateSource: 'ORGANIZATION_PRIVATE',
      isTemplate: true,
      frequency: DEFAULT_TEMPLATE_SET_FREQUENCY,
    });
  });

  it('nulls empty description on create', () => {
    expect(
      buildCreateTemplateSetVariables({
        organizationId: 'org-1',
        name: 'Zestaw',
        description: '   ',
      }).description
    ).toBeNull();
  });

  it('builds add-exercise variables with dual-write load payload', () => {
    expect(
      buildAddExerciseToSetVariables('set-1', 2, {
        exerciseId: 'ex-1',
        sets: 3,
        reps: 10,
        duration: 0,
        restSets: 60,
        restReps: 0,
        preparationTime: 0,
        executionTime: 5,
        notes: 'wolno',
        customName: '',
        customDescription: '',
        tempo: '',
        loadWeightKg: 5,
      })
    ).toEqual({
      exerciseId: 'ex-1',
      exerciseSetId: 'set-1',
      order: 2,
      sets: 3,
      reps: 10,
      duration: null,
      restSets: 60,
      restReps: null,
      preparationTime: null,
      executionTime: 5,
      notes: 'wolno',
      customName: null,
      customDescription: null,
      tempo: null,
      loadWeightKg: 5,
      loadSource: 'manual',
      loadType: 'weight',
      loadValue: 5,
      loadUnit: 'kg',
      loadText: '5 kg',
      overridesJson: '',
    });
  });

  it('falls back to loadValue when loadWeightKg is missing', () => {
    const vars = buildAddExerciseToSetVariables('set-1', 0, {
      exerciseId: 'ex-1',
      loadValue: 12,
    });
    expect(vars.loadWeightKg).toBe(12);
    expect(vars.loadType).toBe('weight');
    expect(vars.loadUnit).toBe('kg');
  });

  it('orchestrates create then ordered addExercise calls', async () => {
    const createSet = vi.fn().mockResolvedValue({
      data: { createExerciseSet: { id: 'set-42' } },
    });
    const addExercise = vi.fn().mockResolvedValue({});

    const setId = await submitCreateTemplateSet(
      { createSet, addExercise },
      { organizationId: 'org-1', name: 'Zestaw A' },
      [
        { exerciseId: 'ex-a', sets: 3, reps: 8 },
        { exerciseId: 'ex-b', sets: 2, reps: 12, loadWeightKg: 4 },
      ]
    );

    expect(setId).toBe('set-42');
    expect(createSet).toHaveBeenCalledTimes(1);
    expect(createSet.mock.calls[0][0].variables.frequency).toEqual(DEFAULT_TEMPLATE_SET_FREQUENCY);
    expect(addExercise).toHaveBeenCalledTimes(2);
    expect(addExercise.mock.calls[0][0].variables.order).toBe(0);
    expect(addExercise.mock.calls[0][0].variables.exerciseId).toBe('ex-a');
    expect(addExercise.mock.calls[1][0].variables.order).toBe(1);
    expect(addExercise.mock.calls[1][0].variables.loadWeightKg).toBe(4);
  });

  it('throws when createExerciseSet returns no id', async () => {
    await expect(
      submitCreateTemplateSet(
        {
          createSet: vi.fn().mockResolvedValue({ data: { createExerciseSet: null } }),
          addExercise: vi.fn(),
        },
        { organizationId: 'org-1', name: 'Zestaw' },
        []
      )
    ).rejects.toThrow('Nie udało się utworzyć zestawu');
  });
});
