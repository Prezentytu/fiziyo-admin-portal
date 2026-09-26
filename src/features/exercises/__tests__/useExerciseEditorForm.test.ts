import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  buildChangedCoreVariables,
  useExerciseEditorForm,
  type ExerciseCoreDraft,
  type ExerciseEditorSource,
} from '../useExerciseEditorForm';

function makeDraft(overrides: Partial<ExerciseCoreDraft> = {}): ExerciseCoreDraft {
  return {
    name: 'Przysiad',
    patientDescription: 'Opis',
    clinicalDescription: '',
    notes: '',
    audioCue: '',
    tempo: '',
    rangeOfMotion: '',
    side: 'none',
    difficultyLevel: 'UNKNOWN',
    videoUrl: '',
    sets: 3,
    reps: 10,
    executionTime: null,
    restSets: 60,
    restReps: 0,
    preparationTime: 5,
    duration: null,
    loadKg: null,
    mainTags: ['tag-a', 'tag-b'],
    additionalTags: ['tag-c'],
    ...overrides,
  };
}

describe('buildChangedCoreVariables', () => {
  it('nie czyści tagów gdy edycja nie dotyczy tagów (passthrough)', () => {
    const initial = makeDraft();
    const current = makeDraft({ sets: 4 });
    const variables = buildChangedCoreVariables(initial, current);

    expect(variables.sets).toBe(4);
    expect(variables).not.toHaveProperty('mainTags');
    expect(variables).not.toHaveProperty('additionalTags');
  });

  it('wysyła mainTags/additionalTags tylko gdy się zmienią', () => {
    const initial = makeDraft();
    const current = makeDraft({ mainTags: ['tag-a'], additionalTags: [] });
    const variables = buildChangedCoreVariables(initial, current);

    expect(variables.mainTags).toEqual(['tag-a']);
    expect(variables.additionalTags).toEqual([]);
  });

  it('wysyła duration gdy zmienione', () => {
    const initial = makeDraft({ duration: null });
    const current = makeDraft({ duration: 60 });
    const variables = buildChangedCoreVariables(initial, current);
    expect(variables.duration).toBe(60);
  });

  it('mapuje difficultyLevel UNKNOWN na null', () => {
    const initial = makeDraft({ difficultyLevel: 'EASY' });
    const current = makeDraft({ difficultyLevel: 'UNKNOWN' });
    const variables = buildChangedCoreVariables(initial, current);
    expect(variables.difficultyLevel).toBeNull();
  });

  it('wysyła exerciseSide none jako nazwę enumu, nie null', () => {
    const initial = makeDraft({ side: 'both' });
    const current = makeDraft({ side: 'none' });
    const variables = buildChangedCoreVariables(initial, current);
    expect(variables.exerciseSide).toBe('none');
  });

  it('nie wysyła exerciseSide gdy strona się nie zmieniła', () => {
    const initial = makeDraft({ side: 'both' });
    const current = makeDraft({ side: 'both', sets: 4 });
    const variables = buildChangedCoreVariables(initial, current);
    expect(variables).not.toHaveProperty('exerciseSide');
    expect(variables.sets).toBe(4);
  });
});

describe('useExerciseEditorForm hydration', () => {
  const source: ExerciseEditorSource = {
    id: 'ex-1',
    name: 'Przysiad',
    defaultSets: 3,
    defaultReps: 10,
    defaultRestBetweenSets: 60,
  };

  it('zachowuje brudny draft po zmianie referencji source (refetch zdjęcia)', () => {
    const { result, rerender } = renderHook(
      ({ formSource }) =>
        useExerciseEditorForm({
          source: formSource,
          updateCore: async () => undefined,
          updateEnrichment: async () => undefined,
        }),
      { initialProps: { formSource: source } }
    );

    act(() => {
      result.current.setCoreField('restSets', 90);
    });
    expect(result.current.isDirty).toBe(true);

    rerender({ formSource: { ...source } });

    expect(result.current.core.restSets).toBe(90);
    expect(result.current.isDirty).toBe(true);
  });

  it('wczytuje nowe wartości source gdy formularz nie jest brudny', () => {
    const { result, rerender } = renderHook(
      ({ formSource }) =>
        useExerciseEditorForm({
          source: formSource,
          updateCore: async () => undefined,
          updateEnrichment: async () => undefined,
        }),
      { initialProps: { formSource: source } }
    );

    rerender({ formSource: { ...source, defaultRestBetweenSets: 45 } });

    expect(result.current.core.restSets).toBe(45);
    expect(result.current.isDirty).toBe(false);
  });
});
