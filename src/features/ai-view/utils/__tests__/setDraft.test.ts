import { describe, expect, it } from 'vitest';

import {
  draftItemFromMapping,
  draftMinutes,
  formatDraftParams,
  moveItem,
  proposeDraftName,
  type DraftItem,
} from '../setDraft';

const ITEM: DraftItem = {
  exerciseId: 'e1',
  sets: 3,
  reps: 10,
  duration: 0,
  executionTime: 3,
  restSets: 60,
  restReps: 0,
  preparationTime: 0,
};

describe('draftItemFromMapping', () => {
  it('lets the catalog set mapping win over exercise defaults', () => {
    const item = draftItemFromMapping(
      { exerciseId: 'e1', sets: 4, reps: null },
      { id: 'e1', defaultSets: 2, defaultReps: 12 }
    );
    expect(item.sets).toBe(4);
    expect(item.reps).toBe(12);
  });
});

describe('draftMinutes', () => {
  it('is zero for an empty draft and rounds a whole set up', () => {
    expect(draftMinutes([])).toBe(0);
    expect(draftMinutes([ITEM])).toBeGreaterThanOrEqual(1);
    expect(draftMinutes([ITEM, { ...ITEM, exerciseId: 'e2' }])).toBeGreaterThanOrEqual(draftMinutes([ITEM]));
  });
});

describe('formatDraftParams', () => {
  it('shows series, repetition time and rest', () => {
    expect(formatDraftParams(ITEM)).toBe('3 × 10 · 3 s powtórzenie · przerwa 60 s');
  });

  it('shows a held series as time', () => {
    expect(formatDraftParams({ ...ITEM, reps: 1, duration: 30, restSets: 0 })).toBe('3 × 30 s');
  });
});

describe('proposeDraftName', () => {
  it('uses the set name or topic, then the patient', () => {
    expect(proposeDraftName({ setName: 'Kolano · faza 2', patientName: 'Jan Kowalski' })).toBe(
      'Kolano · faza 2 · Jan Kowalski'
    );
    expect(proposeDraftName({ topic: 'bark po urazie' })).toBe('Bark po urazie');
    expect(proposeDraftName({})).toBe('Nowy zestaw');
  });

  it('keeps the name within 80 characters', () => {
    expect(proposeDraftName({ topic: 'x'.repeat(100) })).toHaveLength(80);
  });
});

describe('moveItem', () => {
  it('moves one row and ignores out-of-range moves', () => {
    const items = [ITEM, { ...ITEM, exerciseId: 'e2' }, { ...ITEM, exerciseId: 'e3' }];
    expect(moveItem(items, 2, 0).map((item) => item.exerciseId)).toEqual(['e3', 'e1', 'e2']);
    expect(moveItem(items, 0, 5).map((item) => item.exerciseId)).toEqual(['e1', 'e2', 'e3']);
  });
});
