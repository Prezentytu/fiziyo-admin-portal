import { describe, expect, it } from 'vitest';

import { nameSimilarity, nameSuggestionsKey, similarFromSuggestions, suggestedNames } from '../nameSuggestions';

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

  // 26.11 na żywo: „Mostek biodrowy na jednej nodze” pokazywał „Dyg … na jednej nodze” i „Leżenie … tyłem”.
  it('needs the movement itself, not one shared word about position or side', () => {
    const catalog = [
      { id: 'dyg', name: 'Dyg z sięgnięciem odważnikiem kulowym do podłogi i przejście do stania na jednej nodze' },
      { id: 'wedge', name: 'Leżenie na klinie szyjnym (ułożenie lordozujące) – leżenie tyłem, nogi ugięte' },
      { id: 'e2e', name: 'E2E-e4b0a3c2 Mostek biodrowy na jednej nodze' },
    ];
    const names = ['Mostek biodrowy na jednej nodze w leżeniu tyłem', 'Mostek biodrowy z gumą oporową'];
    expect(similarFromSuggestions(catalog, names, new Set())).toEqual([]);
    expect(similarFromSuggestions([...catalog, ...CATALOG], names, new Set()).map((exercise) => exercise.id)).toEqual([
      'bridge',
    ]);
  });

  it('puts the closest name first', () => {
    expect(
      nameSimilarity('Mostek biodrowy na jednej nodze', 'Mostek biodrowy na jednej nodze w leżeniu')
    ).toBeGreaterThan(nameSimilarity('Mostek biodrowy', 'Mostek biodrowy na jednej nodze w leżeniu'));
  });
});
