import { describe, expect, it } from 'vitest';

import { computeExerciseSetDiff, hasExerciseSetChanges, parseExistingInstanceId } from './exerciseSetDiff';

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

  it('wykrywa zmianę executionTime (tryb timer pacjenta)', () => {
    const selectedInstances = [{ instanceId: 'existing-m1-0', exerciseId: 'e1' }];
    const exerciseParams = new Map([
      ['existing-m1-0', { sets: 3, reps: 10, executionTime: 30, notes: '', customName: '', customDescription: '', tempo: '', loadType: '', loadValue: 0, loadUnit: 'kg', loadText: '' }],
    ]);

    const diff = computeExerciseSetDiff({
      initialMappings: [{ id: 'm1', exerciseId: 'e1', order: 1, sets: 3, reps: 10 }],
      selectedInstances,
      exerciseParams,
    });

    expect(diff.toUpdate).toHaveLength(1);
    expect(diff.toUpdate[0]).toMatchObject({ mappingId: 'm1', exerciseId: 'e1' });
    expect(diff.toUpdate[0].params.executionTime).toBe(30);
  });

  it('wykrywa zmianę tylko parametrów bez zmiany kolejności', () => {
    const selectedInstances = [
      { instanceId: 'existing-m1-0', exerciseId: 'e1' },
      { instanceId: 'existing-m2-1', exerciseId: 'e2' },
    ];
    const exerciseParams = new Map([
      ['existing-m1-0', { sets: 5, reps: 10, notes: '', customName: '', customDescription: '', tempo: '', loadType: '', loadValue: 0, loadUnit: 'kg', loadText: '' }],
      ['existing-m2-1', { sets: 4, reps: 12, notes: '', customName: '', customDescription: '', tempo: '', loadType: '', loadValue: 0, loadUnit: 'kg', loadText: '' }],
    ]);

    const diff = computeExerciseSetDiff({ initialMappings, selectedInstances, exerciseParams });

    expect(diff.toUpdate).toHaveLength(1);
    expect(diff.toUpdate[0]).toMatchObject({ mappingId: 'm1', exerciseId: 'e1', order: 1 });
    expect(diff.toUpdate[0].params.sets).toBe(5);
    expect(diff.toAdd).toEqual([]);
    expect(diff.toRemove).toEqual([]);
  });

  it('wykrywa zmianę customName (nadpisanie nazwy ćwiczenia w zestawie)', () => {
    const selectedInstances = [{ instanceId: 'existing-m1-0', exerciseId: 'e1' }];
    const exerciseParams = new Map([
      ['existing-m1-0', { sets: 3, reps: 10, notes: '', customName: 'Wersja łatwiejsza', customDescription: '', tempo: '', loadType: '', loadValue: 0, loadUnit: 'kg', loadText: '' }],
    ]);

    const diff = computeExerciseSetDiff({
      initialMappings: [{ id: 'm1', exerciseId: 'e1', order: 1, sets: 3, reps: 10, customName: '' }],
      selectedInstances,
      exerciseParams,
    });

    expect(diff.toUpdate).toHaveLength(1);
    expect(diff.toUpdate[0].params.customName).toBe('Wersja łatwiejsza');
  });
});

describe('hasExerciseSetChanges', () => {
  const emptyDiff = { toAdd: [], toUpdate: [], toRemove: [] };

  it('zwraca false gdy nic się nie zmieniło', () => {
    expect(hasExerciseSetChanges({
      name: 'Zestaw kolano',
      description: 'Opis',
      initialName: 'Zestaw kolano',
      initialDescription: 'Opis',
      diff: emptyDiff,
    })).toBe(false);
  });

  it('zwraca true gdy zmieniono nazwę', () => {
    expect(hasExerciseSetChanges({
      name: 'Nowa nazwa',
      description: 'Opis',
      initialName: 'Stara nazwa',
      initialDescription: 'Opis',
      diff: emptyDiff,
    })).toBe(true);
  });

  it('zwraca true gdy zmieniono opis', () => {
    expect(hasExerciseSetChanges({
      name: 'Zestaw',
      description: 'Nowy opis',
      initialName: 'Zestaw',
      initialDescription: '',
      diff: emptyDiff,
    })).toBe(true);
  });

  it('zwraca true gdy diff ma ćwiczenia do dodania', () => {
    expect(hasExerciseSetChanges({
      name: 'Zestaw',
      description: '',
      initialName: 'Zestaw',
      initialDescription: '',
      diff: { toAdd: [{ order: 1, exerciseId: 'e1', params: {} }], toUpdate: [], toRemove: [] },
    })).toBe(true);
  });

  it('zwraca true gdy diff ma ćwiczenia do usunięcia', () => {
    expect(hasExerciseSetChanges({
      name: 'Zestaw',
      description: '',
      initialName: 'Zestaw',
      initialDescription: '',
      diff: { toAdd: [], toUpdate: [], toRemove: [{ mappingId: 'm1', exerciseId: 'e1' }] },
    })).toBe(true);
  });

  it('ignoruje whitespace na końcu nazwy przy porównaniu (trim)', () => {
    expect(hasExerciseSetChanges({
      name: '  Zestaw  ',
      description: '',
      initialName: 'Zestaw',
      initialDescription: '',
      diff: emptyDiff,
    })).toBe(false);
  });
});
