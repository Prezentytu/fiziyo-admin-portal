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

  it('turns a held series from a note into one repetition of that time', () => {
    const item = seedDraftItems({
      exerciseIds: ['e1'],
      doses: { e1: { sets: 3, duration: 30 } },
      sets: [],
      setsReady: false,
      exercises: EXERCISES,
      exercisesReady: true,
    })?.items[0];
    expect(item).toMatchObject({ sets: 3, reps: 1, executionTime: 30, duration: 0 });
  });

  it('applies the numbers of a visit note over the exercise defaults', () => {
    expect(
      seedDraftItems({
        exerciseIds: ['e1', 'e2'],
        doses: { e1: { sets: 3, reps: 15 } },
        sets: [],
        setsReady: false,
        exercises: EXERCISES,
        exercisesReady: true,
      })?.items.map((item) => [item.exerciseId, item.sets, item.reps])
    ).toEqual([
      ['e1', 3, 15],
      ['e2', 2, 12],
    ]);
  });

  // Właściciel 18.11: po dopisaniu ćwiczenia przerwy, tempo i notatki pozostałych pozycji zostają.
  it('keeps the rows the therapist tuned and seeds only the added exercise from the catalog', () => {
    const tuned = {
      exerciseId: 'e1',
      sets: 5,
      reps: 8,
      duration: 0,
      executionTime: 4,
      restSets: 45,
      restReps: 2,
      preparationTime: 10,
      side: 'left',
      tempo: '2-1-2',
      loadKg: 5,
      notes: 'bez bólu',
    };
    const seed = seedDraftItems({
      exerciseIds: ['e1', 'e2'],
      items: [tuned],
      doses: { e1: { sets: 1, reps: 1 } },
      sets: [],
      setsReady: false,
      exercises: EXERCISES,
      exercisesReady: true,
    });

    expect(seed?.items[0]).toEqual(tuned);
    expect(seed?.items[1]).toMatchObject({ exerciseId: 'e2', sets: 2, reps: 12 });
  });

  it('still reads an older draft that carries only the short doses', () => {
    expect(
      seedDraftItems({
        exerciseIds: ['e1'],
        doses: { e1: { sets: 4, reps: 6 } },
        sets: [],
        setsReady: false,
        exercises: EXERCISES,
        exercisesReady: true,
      })
    ).toMatchObject({ items: [{ exerciseId: 'e1', sets: 4, reps: 6 }] });
  });

  // Wersja zestawu z katalogu, do której fizjo wraca: pozycje tak, jak je zostawił, nie z mappingu zestawu.
  it('prefers the kept rows over the catalog set mapping', () => {
    const kept = {
      exerciseId: 'e1',
      sets: 9,
      reps: 9,
      duration: 0,
      executionTime: 0,
      restSets: 7,
      restReps: 0,
      preparationTime: 0,
    };
    expect(
      seedDraftItems({
        setId: 's1',
        exerciseIds: ['e1'],
        items: [kept],
        sets: [SET],
        setsReady: true,
        exercises: EXERCISES,
        exercisesReady: true,
      })
    ).toEqual({ items: [kept], missingSet: false });
  });

  it('marks the proposed warm-up on fresh rows and keeps the flag the therapist left on continued rows', () => {
    const seed = seedDraftItems({
      exerciseIds: ['e1', 'e2'],
      warmupExerciseIds: ['e1', 'e2'],
      items: [{ exerciseId: 'e2', sets: 1, reps: 1, duration: 0, executionTime: 0, restSets: 0, restReps: 0, preparationTime: 0 }],
      sets: [],
      setsReady: true,
      exercises: EXERCISES,
      exercisesReady: true,
    });
    expect(seed?.items.map((item) => item.isWarmup)).toEqual([true, undefined]);
  });

  // SPEC-068 (K1): jawna lista exerciseIds zawsze wygrywa z setId/baseSetId i dziedziczy parametry tylko dla zachowanych pozycji.
  it('prefers explicit exerciseIds over setId/baseSetId and inherits mapping overrides for retained exercises only', () => {
    const baseSet = {
      id: 'set-plan',
      exerciseMappings: [
        { exerciseId: 'e1', order: 1, sets: 5, reps: 8, restSets: 45 },
        { exerciseId: 'e2', order: 2, sets: 4, reps: 15, restSets: 30 },
      ],
    };
    const exercises = [
      { id: 'e1', defaultSets: 3, defaultReps: 10, side: 'none' },
      { id: 'e2', defaultSets: 2, defaultReps: 12, side: 'none' },
      { id: 'e3', defaultSets: 3, defaultReps: 6, side: 'none' },
    ];

    const seed = seedDraftItems({
      setId: 'set-plan',
      baseSetId: 'set-plan',
      exerciseIds: ['e2', 'e3'],
      sets: [baseSet],
      setsReady: true,
      exercises,
      exercisesReady: true,
      missingSettled: true,
    });

    expect(seed?.missingSet).toBe(false);
    expect(seed?.items.map((item) => item.exerciseId)).toEqual(['e2', 'e3']);
    // e2 dziedziczy parametry planu bazowego, e3 bierze domyślne z katalogu, a e1 nie wraca.
    expect(seed?.items[0]).toMatchObject({ exerciseId: 'e2', sets: 4, reps: 15, restSets: 30 });
    expect(seed?.items[1]).toMatchObject({ exerciseId: 'e3', sets: 3, reps: 6 });
  });

  // SPEC-068 (K5): ponowne wczytanie planu z setId używa osadzonego mapping.exercise (side/type), nie domyślnego 'both'.
  it('uses embedded mapping.exercise side and type on setId reload instead of doubling duration via default both', () => {
    const planSet = {
      id: 'set-reload',
      exerciseMappings: [
        {
          exerciseId: 'e-not-on-page-1',
          order: 1,
          sets: 3,
          reps: 10,
          restSets: 30,
          exercise: { id: 'e-not-on-page-1', side: 'none', type: 'REPS', defaultSets: 3, defaultReps: 10 },
        },
      ],
    };

    const seed = seedDraftItems({
      setId: 'set-reload',
      exerciseIds: [],
      sets: [planSet],
      setsReady: true,
      exercises: [],
      exercisesReady: true,
    });

    expect(seed?.items).toHaveLength(1);
    expect(seed?.items[0]?.side).toBe('none');
    expect(seed?.items[0]?.exerciseType).toBe('REPS');
  });
});
