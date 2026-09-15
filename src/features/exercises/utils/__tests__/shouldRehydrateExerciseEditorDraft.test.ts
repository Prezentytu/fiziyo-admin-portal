import { describe, expect, it } from 'vitest';

import { shouldRehydrateExerciseEditorDraft } from '../shouldRehydrateExerciseEditorDraft';

describe('shouldRehydrateExerciseEditorDraft', () => {
  const base = {
    hasSource: true,
    hasHydrated: true,
    isDirty: false,
    isAutosave: false,
    sourceIdentity: 'ex-1',
    hydratedIdentity: 'ex-1',
  };

  it('nie nadpisuje brudnego draftu po refetchu tego samego ćwiczenia', () => {
    expect(shouldRehydrateExerciseEditorDraft({ ...base, isDirty: true })).toBe(false);
  });

  it('odświeża czysty draft po refetchu (np. po zapisie zdjęcia)', () => {
    expect(shouldRehydrateExerciseEditorDraft(base)).toBe(true);
  });

  it('hydratuje przy pierwszym źródle i przy zmianie ćwiczenia nawet gdy dirty', () => {
    expect(
      shouldRehydrateExerciseEditorDraft({
        ...base,
        hasHydrated: false,
        hydratedIdentity: null,
        sourceIdentity: 'ex-1',
        isDirty: false,
      })
    ).toBe(true);

    expect(
      shouldRehydrateExerciseEditorDraft({
        ...base,
        isDirty: true,
        sourceIdentity: 'ex-2',
        hydratedIdentity: 'ex-1',
      })
    ).toBe(true);
  });

  it('w autosave po pierwszej hydracji nie resetuje draftu', () => {
    expect(shouldRehydrateExerciseEditorDraft({ ...base, isAutosave: true, isDirty: false })).toBe(
      false
    );
  });

  it('nie hydratuje bez źródła', () => {
    expect(shouldRehydrateExerciseEditorDraft({ ...base, hasSource: false })).toBe(false);
  });
});
