import { describe, expect, it } from 'vitest';
import { filterExercisesBySource, countBySource } from './exerciseSourceFilter';
function ex(id: string, scope?: string): { id: string; scope?: string } {
  return { id, scope };
}

describe('filterExercisesBySource', () => {
  const exercises = [
    ex('1', 'ORGANIZATION'),
    ex('2', 'PERSONAL'),
    ex('3', 'GLOBAL'),
    ex('4'), // no scope
  ];

  it('returns all exercises when filter is all', () => {
    expect(filterExercisesBySource(exercises, 'all')).toHaveLength(4);
    expect(filterExercisesBySource(exercises, 'all')).toEqual(exercises);
  });

  it('returns only ORGANIZATION and PERSONAL when filter is organization', () => {
    const result = filterExercisesBySource(exercises, 'organization');
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(['1', '2']);
    expect(result.every((e) => e.scope === 'ORGANIZATION' || e.scope === 'PERSONAL')).toBe(true);
  });

  it('returns only GLOBAL when filter is fiziyo', () => {
    const result = filterExercisesBySource(exercises, 'fiziyo');
    expect(result).toHaveLength(1);
    expect(result[0].scope).toBe('GLOBAL');
    expect(result[0].id).toBe('3');
  });

  it('excludes exercises with no scope from organization and fiziyo', () => {
    expect(filterExercisesBySource(exercises, 'organization').find((e) => e.id === '4')).toBeUndefined();
    expect(filterExercisesBySource(exercises, 'fiziyo').find((e) => e.id === '4')).toBeUndefined();
  });

  it('returns empty array when no exercise matches source', () => {
    const onlyOrg = [ex('a', 'ORGANIZATION')];
    expect(filterExercisesBySource(onlyOrg, 'fiziyo')).toEqual([]);
    const onlyGlobal = [ex('b', 'GLOBAL')];
    expect(filterExercisesBySource(onlyGlobal, 'organization')).toEqual([]);
  });
});

describe('countBySource', () => {
  it('counts total, organization (ORGANIZATION+PERSONAL), and fiziyo (GLOBAL)', () => {
    const exercises = [
      ex('1', 'ORGANIZATION'),
      ex('2', 'PERSONAL'),
      ex('3', 'GLOBAL'),
      ex('4'), // no scope - not in organization nor fiziyo
    ];
    const counts = countBySource(exercises);
    expect(counts.total).toBe(4);
    expect(counts.organization).toBe(2);
    expect(counts.fiziyo).toBe(1);
  });

  it('returns zeros for empty array', () => {
    const counts = countBySource([]);
    expect(counts.total).toBe(0);
    expect(counts.organization).toBe(0);
    expect(counts.fiziyo).toBe(0);
  });
});
