import { describe, expect, it } from 'vitest';

import {
  MEDIA_PERSISTED_SAVE_HINT,
  resolveExerciseDetailSaveBarKind,
} from '../exerciseDetailSaveBar';

describe('resolveExerciseDetailSaveBarKind', () => {
  it('po zapisanym zdjęciu bez innych zmian pokazuje komunikat o zapisie mediów', () => {
    expect(
      resolveExerciseDetailSaveBarKind({
        saveStatus: 'idle',
        isDirty: false,
        hasMediaPersistNotice: true,
      })
    ).toBe('media-persisted');
    expect(MEDIA_PERSISTED_SAVE_HINT).toContain('nie wymaga przycisku Zapisz');
  });

  it('brudny formularz ma pierwszeństwo przed komunikatem o zdjęciu', () => {
    expect(
      resolveExerciseDetailSaveBarKind({
        saveStatus: 'idle',
        isDirty: true,
        hasMediaPersistNotice: true,
      })
    ).toBe('dirty');
  });

  it('błąd zapisu ma pierwszeństwo', () => {
    expect(
      resolveExerciseDetailSaveBarKind({
        saveStatus: 'error',
        isDirty: true,
        hasMediaPersistNotice: true,
      })
    ).toBe('error');
  });
});
