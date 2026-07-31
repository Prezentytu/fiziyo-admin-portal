import { describe, expect, it } from 'vitest';
import { buildChangedCoreVariables, type ExerciseCoreDraft } from '../useExerciseEditorForm';

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
});
