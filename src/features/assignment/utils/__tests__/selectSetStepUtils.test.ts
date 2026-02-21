import { describe, expect, it } from 'vitest';
import { filterSetsByQuery, sortSetsForSelection } from '../selectSetStepUtils';
import type { AssignedSetInfo, ExerciseSet } from '../../types';

function set(id: string, name: string, description?: string, mappingCount = 1): ExerciseSet {
  return {
    id,
    name,
    description,
    exerciseMappings:
      mappingCount === 0 ? [] : ([{ id: `m-${id}`, exerciseId: 'e1' }] as ExerciseSet['exerciseMappings']),
  };
}

describe('filterSetsByQuery', () => {
  const sets: ExerciseSet[] = [
    set('1', 'Rehab kolana', 'Zestaw na kolano'),
    set('2', 'Core tydzień 1', 'Brzuch i plecy'),
    set('3', 'Rozciąganie'),
  ];

  it('returns all sets when query is empty or whitespace', () => {
    expect(filterSetsByQuery(sets, '')).toEqual(sets);
    expect(filterSetsByQuery(sets, '   ')).toEqual(sets);
  });

  it('matches by name case-insensitively', () => {
    expect(filterSetsByQuery(sets, 'core')).toHaveLength(1);
    expect(filterSetsByQuery(sets, 'CORE')[0].name).toBe('Core tydzień 1');
    expect(filterSetsByQuery(sets, 'rehab')[0].name).toBe('Rehab kolana');
  });

  it('matches by description when present', () => {
    const result = filterSetsByQuery(sets, 'kolano');
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Zestaw na kolano');
  });

  it('returns empty array when no set matches', () => {
    expect(filterSetsByQuery(sets, 'xyz')).toEqual([]);
  });
});

describe('sortSetsForSelection', () => {
  const assigned: AssignedSetInfo[] = [
    { exerciseSetId: 'assigned-1', assignmentId: 'a1', assignedAt: '', status: 'active' },
  ];

  it('puts assigned sets at the bottom', () => {
    const sets: ExerciseSet[] = [
      set('free-1', 'Wolny', undefined, 2),
      set('assigned-1', 'Przypisany', undefined, 1),
      set('free-2', 'Drugi wolny', undefined, 1),
    ];
    const sorted = sortSetsForSelection(sets, assigned);
    const ids = sorted.map((s) => s.id);
    expect(ids.indexOf('assigned-1')).toBe(ids.length - 1);
  });

  it('puts empty sets (newly created) at the top among non-assigned', () => {
    const sets: ExerciseSet[] = [
      set('with-ex', 'Z ćwiczeniami', undefined, 3),
      set('empty', 'Pusty nowy', undefined, 0),
      set('also-empty', 'Też pusty', undefined, 0),
    ];
    const sorted = sortSetsForSelection(sets, []);
    expect(sorted[0].exerciseMappings?.length ?? 0).toBe(0);
    expect(sorted[1].exerciseMappings?.length ?? 0).toBe(0);
    expect((sorted[2].exerciseMappings?.length ?? 0) > 0).toBe(true);
  });

  it('assigned sets are at bottom even when empty', () => {
    const sets: ExerciseSet[] = [
      set('assigned-empty', 'Przypisany pusty', undefined, 0),
      set('free-full', 'Wolny pełny', undefined, 2),
    ];
    const assignedEmpty: AssignedSetInfo[] = [
      { exerciseSetId: 'assigned-empty', assignmentId: 'a1', assignedAt: '', status: 'active' },
    ];
    const sorted = sortSetsForSelection(sets, assignedEmpty);
    expect(sorted[0].id).toBe('free-full');
    expect(sorted[1].id).toBe('assigned-empty');
  });
});
