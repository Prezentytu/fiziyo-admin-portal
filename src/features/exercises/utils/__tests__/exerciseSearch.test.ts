import { describe, expect, it } from 'vitest';

import {
  filterExercisesBySearch,
  matchesExerciseSearch,
  rankExerciseSearch,
  tokenizeSearchQuery,
} from '../exerciseSearch';

const kettlebell = {
  id: '1',
  name: 'Przysiad z kettlebell',
  description: 'Utrzymuj klatkę',
};

const mostek = {
  id: '2',
  name: 'Mostek',
  description: 'Przysiad z kettlebell w opisie',
  createdByEmail: 'jan@gmail.com',
};

describe('tokenizeSearchQuery', () => {
  it('drops short tokens and caps count', () => {
    expect(tokenizeSearchQuery('  Przysiad   z   kettlebell  ')).toEqual(['przysiad', 'kettlebell']);
  });
});

describe('matchesExerciseSearch', () => {
  it('matches regardless of word order', () => {
    expect(matchesExerciseSearch(kettlebell, 'kettlebell przysiad')).toBe(true);
  });

  it('treats Polish diacritics as optional', () => {
    const spine = { name: 'Kręgosłup lędźwiowy' };
    expect(matchesExerciseSearch(spine, 'kregoslup')).toBe(true);
    expect(matchesExerciseSearch(spine, 'kręgosłup')).toBe(true);
  });

  it('does not match author email', () => {
    expect(matchesExerciseSearch(mostek, 'gmail')).toBe(false);
  });

  it('matches tags by name, not as a whole phrase', () => {
    const tagged = {
      name: 'Deska',
      mainTags: [{ id: 't1', name: 'core' }],
    };
    expect(matchesExerciseSearch(tagged, 'core')).toBe(true);
    expect(matchesExerciseSearch(tagged, 'core przysiad')).toBe(false);
  });
});

describe('filterExercisesBySearch', () => {
  const catalog = [kettlebell, mostek, { id: '3', name: 'Wypad', description: 'kolano' }];

  it('narrows when a token is appended', () => {
    expect(filterExercisesBySearch(catalog, 'przysiad').map((item) => item.id)).toEqual(['1', '2']);
    expect(filterExercisesBySearch(catalog, 'przysiad kettlebell').map((item) => item.id)).toEqual(['1', '2']);
    expect(filterExercisesBySearch(catalog, 'przysiad kettlebell hantle')).toEqual([]);
  });

  it('ranks name hits before description hits', () => {
    expect(rankExerciseSearch(kettlebell, 'przysiad kettlebell')).toBe(0);
    expect(rankExerciseSearch(mostek, 'przysiad kettlebell')).toBe(3);
    expect(filterExercisesBySearch([mostek, kettlebell], 'przysiad kettlebell').map((item) => item.id)).toEqual([
      '1',
      '2',
    ]);
  });
});
