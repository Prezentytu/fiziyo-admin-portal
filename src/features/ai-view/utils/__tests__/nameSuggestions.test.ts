import { describe, expect, it } from 'vitest';

import { nameSuggestionsKey, similarFromSuggestions, suggestedNames } from '../nameSuggestions';

const CATALOG = [
  { id: 'row', name: 'Wiosłowanie z gumą w siadzie' },
  { id: 'row-stand', name: 'Wiosłowanie z gumą w staniu' },
  { id: 'chin', name: 'Cofanie brody (retrakcja szyi)' },
  { id: 'bridge', name: 'Mostek biodrowy' },
];

// 26.11 (Przemek): po wpisaniu nazwy „Czy chodziło Ci o” i podobne ćwiczenia z katalogu.
describe('suggestedNames', () => {
  it('keeps up to three different names, none the same as the typed one', () => {
    expect(
      suggestedNames(
        [
          { name: 'Retrakcja szyi' },
          { name: 'Cofanie brody w leżeniu' },
          { name: 'cofanie  brody w leżeniu!' },
          { name: 'Cofanie brody przy ścianie' },
          { name: 'Cofanie brody z gumą' },
        ],
        'retrakcja szyi'
      )
    ).toEqual(['Cofanie brody w leżeniu', 'Cofanie brody przy ścianie', 'Cofanie brody z gumą']);
  });

  it('asks once per text regardless of case, accents and punctuation', () => {
    expect(nameSuggestionsKey('Wiosłowanie  z GUMĄ!')).toBe(nameSuggestionsKey('wioslowanie z guma'));
  });
});

describe('similarFromSuggestions', () => {
  it('finds catalog exercises for the suggested names, without the ones already shown', () => {
    expect(
      similarFromSuggestions(CATALOG, ['Wiosłowanie z gumą', 'Cofanie brody'], new Set(['row'])).map(
        (exercise) => exercise.id
      )
    ).toEqual(['row-stand', 'chin']);
  });

  it('stops at the limit', () => {
    expect(similarFromSuggestions(CATALOG, ['Wiosłowanie z gumą'], new Set(), 1)).toHaveLength(1);
  });
});
