import { describe, expect, it } from 'vitest';
import { findSimilar, isProbableTypo, levenshtein, normalizeForMatch, similarity } from './stringSimilarity';

describe('normalizeForMatch', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeForMatch('Hip Thrust z obciążeniem')).toBe('hip thrust z obciazeniem');
    expect(normalizeForMatch('Łokieć')).toBe('lokiec');
  });

  it('compresses whitespace', () => {
    expect(normalizeForMatch('  hip   thrust  ')).toBe('hip thrust');
  });
});

describe('levenshtein', () => {
  it.each([
    ['trust', 'thrust', 1],
    ['squat', 'squad', 1],
    ['deadlift', 'dedlift', 1],
    ['hip thrust', 'hip trust', 1],
    ['', 'abc', 3],
    ['abc', '', 3],
    ['kot', 'kot', 0],
  ])('levenshtein(%s, %s) === %d', (a, b, expected) => {
    expect(levenshtein(a, b)).toBe(expected);
  });
});

describe('similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(similarity('hip thrust', 'hip thrust')).toBe(1);
  });

  it('returns 0 for empty vs non-empty', () => {
    expect(similarity('', 'hip')).toBe(0);
  });

  it('high similarity for typos', () => {
    expect(similarity('hip trust', 'hip thrust')).toBeGreaterThan(0.85);
  });
});

describe('isProbableTypo', () => {
  it('detects single-character English typos in fitness terms', () => {
    expect(isProbableTypo('trust', 'thrust')).toBe(true);
    expect(isProbableTypo('squat', 'squad')).toBe(true);
    expect(isProbableTypo('hip trust', 'hip thrust')).toBe(true);
    expect(isProbableTypo('hip trust z obciążeniem', 'Hip Thrust z obciążeniem')).toBe(true);
  });

  it('detects Polish diacritic-missing typos', () => {
    expect(isProbableTypo('martwy ciung', 'martwy ciąg')).toBe(true);
  });

  it('returns false for completely different words', () => {
    expect(isProbableTypo('przysiad', 'wykrok')).toBe(false);
    expect(isProbableTypo('kot', 'pies')).toBe(false);
  });

  it('returns false for identical strings (typo == false, duplicate handled separately)', () => {
    expect(isProbableTypo('Hip Thrust', 'hip thrust')).toBe(false);
  });

  it('returns false for too-short tokens (high false positive rate)', () => {
    expect(isProbableTypo('a', 'ab')).toBe(false);
    expect(isProbableTypo('kot', 'kop')).toBe(false);
  });
});

describe('findSimilar', () => {
  const exercises = [
    { id: '1', name: 'Hip Thrust' },
    { id: '2', name: 'Hip Thrust z hantlem' },
    { id: '3', name: 'Glute Bridge' },
    { id: '4', name: 'Przysiad ze sztangą' },
    { id: '5', name: 'Martwy ciąg' },
  ];

  it('finds typo match for "hip trust"', () => {
    const results = findSimilar('hip trust', exercises, (e) => e.name);
    expect(results.map((e) => e.name)).toContain('Hip Thrust');
  });

  it('finds typo match for "martwy ciung"', () => {
    const results = findSimilar('martwy ciung', exercises, (e) => e.name);
    expect(results.map((e) => e.name)).toContain('Martwy ciąg');
  });

  it('skips exact (case-insensitive) matches', () => {
    const results = findSimilar('Hip Thrust', exercises, (e) => e.name);
    expect(results.map((e) => e.name)).not.toContain('Hip Thrust');
  });

  it('returns empty array for too-short query', () => {
    expect(findSimilar('a', exercises, (e) => e.name)).toEqual([]);
  });

  it('respects limit', () => {
    const results = findSimilar('hip', exercises, (e) => e.name, { limit: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
