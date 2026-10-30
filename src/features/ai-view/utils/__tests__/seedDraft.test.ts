import { describe, expect, it } from 'vitest';

import { seedDraftItems } from '../seedDraft';

const EXERCISES = [
  { id: 'e1', defaultSets: 3, defaultReps: 10 },
  { id: 'e2', defaultSets: 2, defaultReps: 12 },
];
const SET = { id: 's1', exerciseMappings: [{ exerciseId: 'e2', order: 1, sets: 4 }] };

describe('seedDraftItems', () => {
  it('waits for the catalog sets before seeding a draft that starts from a set', () => {
    expect(
      seedDraftItems({
        setId: 's1',
        exerciseIds: [],
        sets: [],
        setsReady: false,
        exercises: EXERCISES,
        exercisesReady: true,
      })
    ).toBeNull();
  });

  it('seeds from the set once it arrives, the mapping winning over defaults', () => {
    expect(
      seedDraftItems({
        setId: 's1',
        exerciseIds: [],
        sets: [SET],
        setsReady: true,
        exercises: EXERCISES,
        exercisesReady: true,
      })
    ).toMatchObject({ items: [{ exerciseId: 'e2', sets: 4, reps: 12 }], missingSet: false });
  });

  it('says the set is missing instead of pretending it is empty', () => {
    expect(
      seedDraftItems({
        setId: 's1',
        exerciseIds: [],
        sets: [],
        setsReady: true,
        exercises: EXERCISES,
        exercisesReady: true,
      })
    ).toEqual({ items: [], missingSet: true });
  });

  it('seeds picked exercises without waiting for sets', () => {
    expect(
      seedDraftItems({ exerciseIds: ['e1'], sets: [], setsReady: false, exercises: EXERCISES, exercisesReady: true })
    ).toMatchObject({ items: [{ exerciseId: 'e1', sets: 3 }], missingSet: false });
    expect(
      seedDraftItems({ exerciseIds: ['e1'], sets: [], setsReady: true, exercises: [], exercisesReady: false })
    ).toBeNull();
  });
});
