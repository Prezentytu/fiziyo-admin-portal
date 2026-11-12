import { describe, expect, it } from 'vitest';

import {
  flattenPickerPages,
  mergeKnownExercises,
  toPickerLibraryTab,
  topPopularExerciseIds,
  visiblePopularExerciseIds,
} from './exercisePickerPages';

describe('flattenPickerPages', () => {
  it('łączy strony w kolejności numerów, nie wstawienia, i pomija powtórzone ćwiczenie', () => {
    const pages = new Map([
      [2, [{ id: 'c' }, { id: 'b' }]],
      [1, [{ id: 'a' }, { id: 'b' }]],
    ]);

    expect(flattenPickerPages(pages).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('topPopularExerciseIds', () => {
  it('zwraca najczęściej używane, bez zerowych, z limitem', () => {
    expect(topPopularExerciseIds({ a: 1, b: 5, c: 0, d: 3 }, 2)).toEqual(['b', 'd']);
  });

  it('przy remisie kolejność jest stała', () => {
    expect(topPopularExerciseIds({ z: 2, a: 2 })).toEqual(['a', 'z']);
  });

  it('bez danych o użyciu nie ma popularnych', () => {
    expect(topPopularExerciseIds(undefined)).toEqual([]);
  });
});

describe('visiblePopularExerciseIds', () => {
  it('zostawia tylko ćwiczenia potwierdzone przez bibliotekę, w kolejności użycia, z limitem', () => {
    expect(visiblePopularExerciseIds(['ukryte', 'a', 'b', 'c'], new Set(['c', 'a', 'b']), 2)).toEqual(['a', 'b']);
  });

  it('bez potwierdzenia z biblioteki nie ma popularnych', () => {
    expect(visiblePopularExerciseIds(['a', 'b'], new Set())).toEqual([]);
  });
});

describe('mergeKnownExercises', () => {
  it('dokłada rekordy pobrane po id, ale rekord ze strony wygrywa', () => {
    const merged = mergeKnownExercises(
      [{ id: 'a', updatedAt: 'nowy' }],
      new Map([
        ['a', { id: 'a', updatedAt: 'stary' }],
        ['x', { id: 'x', updatedAt: 't' }],
      ])
    );

    expect(merged).toEqual([
      { id: 'a', updatedAt: 'nowy' },
      { id: 'x', updatedAt: 't' },
    ]);
  });
});

describe('toPickerLibraryTab', () => {
  it('mapuje filtr źródła na zakładkę API', () => {
    expect(toPickerLibraryTab('all')).toBe('ALL');
    expect(toPickerLibraryTab('organization')).toBe('ORGANIZATION');
    expect(toPickerLibraryTab('fiziyo')).toBe('FIZIYO');
  });
});
