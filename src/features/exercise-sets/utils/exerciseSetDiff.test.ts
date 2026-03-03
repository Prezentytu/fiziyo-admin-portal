import { describe, expect, it } from 'vitest';

import { computeExerciseSetDiff, parseExistingInstanceId } from './exerciseSetDiff';

describe('parseExistingInstanceId', () => {
  it('parsuje poprawny instanceId z mappingId zawierającym myślniki', () => {
    expect(parseExistingInstanceId('existing-mapping-abc-2')).toEqual({
      mappingId: 'mapping-abc',
      index: 2,
    });
  });

  it('zwraca null dla nowej instancji', () => {
    expect(parseExistingInstanceId('exercise-123-random')).toBeNull();
  });
});

describe('computeExerciseSetDiff', () => {
  const initialMappings = [
    { id: 'm1', exerciseId: 'e1', order: 1, sets: 3, reps: 10, notes: '' },
    { id: 'm2', exerciseId: 'e2', order: 2, sets: 4, reps: 12, notes: '' },
  ];

  it('zwraca pusty diff gdy nic się nie zmieniło', () => {
    const selectedInstances = [
      { instanceId: 'existing-m1-0', exerciseId: 'e1' },
      { instanceId: 'existing-m2-1', exerciseId: 'e2' },
    ];
    const exerciseParams = new Map([
      ['existing-m1-0', { sets: 3, reps: 10, notes: '', customName: '', customDescription: '', tempo: '', loadType: '', loadValue: 0, loadUnit: 'kg', loadText: '' }],
      ['existing-m2-1', { sets: 4, reps: 12, notes: '', customName: '', customDescription: '', tempo: '', loadType: '', loadValue: 0, loadUnit: 'kg', loadText: '' }],
    ]);

    const diff = computeExerciseSetDiff({ initialMappings, selectedInstances, exerciseParams });

    expect(diff.toAdd).toEqual([]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toRemove).toEqual([]);
  });

  it('wykrywa nowe ćwiczenie do dodania', () => {
    const selectedInstances = [
      { instanceId: 'existing-m1-0', exerciseId: 'e1' },
      { instanceId: 'existing-m2-1', exerciseId: 'e2' },
      { instanceId: 'e3-new-instance', exerciseId: 'e3' },
    ];
    const exerciseParams = new Map([['e3-new-instance', { sets: 2, reps: 8 }]]);

    const diff = computeExerciseSetDiff({ initialMappings, selectedInstances, exerciseParams });

    expect(diff.toAdd).toEqual([{ order: 3, exerciseId: 'e3', params: { sets: 2, reps: 8 } }]);
    expect(diff.toUpdate).toEqual([]);
    expect(diff.toRemove).toEqual([]);
  });

  it('wykrywa usunięte ćwiczenie', () => {
    const selectedInstances = [{ instanceId: 'existing-m1-0', exerciseId: 'e1' }];
    const exerciseParams = new Map();

    const diff = computeExerciseSetDiff({ initialMappings, selectedInstances, exerciseParams });

    expect(diff.toRemove).toEqual([{ mappingId: 'm2', exerciseId: 'e2' }]);
    expect(diff.toAdd).toEqual([]);
  });

  it('wykrywa zmianę kolejności i parametrów', () => {
    const selectedInstances = [
      { instanceId: 'existing-m2-1', exerciseId: 'e2' },
      { instanceId: 'existing-m1-0', exerciseId: 'e1' },
    ];
    const exerciseParams = new Map([['existing-m2-1', { sets: 5, reps: 12, notes: '', customName: '', customDescription: '', tempo: '', loadType: '', loadValue: 0, loadUnit: 'kg', loadText: '' }]]);

    const diff = computeExerciseSetDiff({ initialMappings, selectedInstances, exerciseParams });

    expect(diff.toUpdate).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mappingId: 'm2', order: 1 }),
        expect.objectContaining({ mappingId: 'm1', order: 2 }),
      ])
    );
    expect(diff.toUpdate).toHaveLength(2);
    expect(diff.toAdd).toEqual([]);
    expect(diff.toRemove).toEqual([]);
  });
});
