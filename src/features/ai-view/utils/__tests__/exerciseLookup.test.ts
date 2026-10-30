import { describe, expect, it } from 'vitest';

import { pickExercisesById, searchExercises } from '../exerciseLookup';

const EXERCISES = [
  { id: 'e1', name: 'Mini przysiad przy ścianie', description: 'Wzmacnia kolano' },
  { id: 'e2', name: 'Zginanie kolana w siadzie' },
  { id: 'e3', name: 'Koci grzbiet', mainTags: [{ name: 'Kręgosłup' }] },
  { id: 'e4', name: 'Deska boczna' },
];

describe('searchExercises', () => {
  it('matches inflected words, name hits before description hits', () => {
    expect(searchExercises(EXERCISES, 'kolano').map((exercise) => exercise.id)).toEqual(['e2', 'e1']);
  });

  it('searches tags without diacritics', () => {
    expect(searchExercises(EXERCISES, 'kregoslup').map((exercise) => exercise.id)).toEqual(['e3']);
  });

  it('ranks exercises hitting every word first', () => {
    expect(searchExercises(EXERCISES, 'deska kolano')[0]?.id).not.toBe('e3');
    expect(searchExercises(EXERCISES, 'zginanie kolana')[0]?.id).toBe('e2');
  });

  it('returns nothing for an empty query and respects the limit', () => {
    expect(searchExercises(EXERCISES, ' ')).toEqual([]);
    expect(searchExercises(EXERCISES, 'kolano', 1)).toHaveLength(1);
  });
});

describe('pickExercisesById', () => {
  it('keeps the requested order and drops unknown ids', () => {
    expect(pickExercisesById(EXERCISES, ['e3', 'missing', 'e1']).map((exercise) => exercise.id)).toEqual(['e3', 'e1']);
  });
});
