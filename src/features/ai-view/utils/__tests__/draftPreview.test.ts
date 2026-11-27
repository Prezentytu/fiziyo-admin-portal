import { describe, expect, it } from 'vitest';

import { draftPreviewData } from '../draftPreview';
import type { DraftItem } from '../setDraft';

const EXERCISE = {
  id: 'ex-cat',
  name: 'Koci grzbiet',
  type: 'reps',
  defaultSets: 3,
  defaultReps: 12,
  defaultRestBetweenSets: 60,
};

const ITEM: DraftItem = {
  exerciseId: 'ex-cat',
  sets: 2,
  reps: 10,
  duration: 0,
  executionTime: 4,
  restSets: 15,
  restReps: 0,
  preparationTime: 5,
};

// 26.11 (Przemek): ćwiczenia z propozycji zestawu nie dało się podejrzeć; podgląd pokazuje parametry z propozycji.
describe('draftPreviewData', () => {
  it('shows the exercise with the proposal parameters, not the catalog defaults', () => {
    const preview = draftPreviewData(EXERCISE, ITEM);

    expect(preview.displayName).toBe('Koci grzbiet');
    expect(preview.sets).toBe(2);
    expect(preview.reps).toBe(10);
    expect(preview.restSets).toBe(15);
    expect(preview.executionTime).toBe(4);
  });
});
