import { describe, expect, it } from 'vitest';

import { findAlternatives } from '../exerciseAlternatives';

const SQUAT = { id: 'squat', name: 'Przysiad', mainTags: [{ name: 'Kolano' }], additionalTags: ['Siła'] };
const POOL = [
  SQUAT,
  { id: 'lunge', name: 'Wykrok', mainTags: [{ name: 'kolano' }], additionalTags: ['siła'] },
  { id: 'bridge', name: 'Mostek', mainTags: ['Biodro'], additionalTags: ['Siła'] },
  { id: 'step', name: 'Wejście na stopień', mainTags: ['Kolano'] },
  { id: 'neck', name: 'Retrakcja szyi', mainTags: ['Szyja'] },
];

describe('findAlternatives', () => {
  it('ranks shared main tags above additional ones, case-insensitively', () => {
    expect(findAlternatives(SQUAT, POOL, []).map((exercise) => exercise.id)).toEqual(['lunge', 'step', 'bridge']);
  });

  it('never returns the exercise itself or ones already in the draft', () => {
    expect(findAlternatives(SQUAT, POOL, ['lunge']).map((exercise) => exercise.id)).toEqual(['step', 'bridge']);
  });

  it('returns nothing for an exercise without tags', () => {
    expect(findAlternatives({ id: 'x', name: 'X' }, POOL, [])).toEqual([]);
  });
});
