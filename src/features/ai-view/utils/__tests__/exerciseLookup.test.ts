import { describe, expect, it } from 'vitest';

import { pickExercisesById, searchExercises, withTagNames } from '../exerciseLookup';

const EXERCISES = [
  { id: 'e1', name: 'Mini przysiad przy ścianie', description: 'Wzmacnia kolano' },
  { id: 'e2', name: 'Zginanie kolana w siadzie' },
  { id: 'e3', name: 'Koci grzbiet', mainTags: [{ name: 'Kręgosłup' }] },
  { id: 'e4', name: 'Deska boczna' },
  {
    id: 'e5',
    name: 'Mostek biodrowy',
    clinicalDescription: 'Aktywuje prostowniki stawu biodrowego',
    additionalTags: [{ name: 'pośladki' }],
  },
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

  it('matches a plural or genitive query against the singular name and back', () => {
    expect(searchExercises(EXERCISES, 'mostki').map((exercise) => exercise.id)).toEqual(['e5']);
    expect(searchExercises(EXERCISES, 'pośladków').map((exercise) => exercise.id)).toEqual(['e5']);
    expect(searchExercises(EXERCISES, 'kolanie').map((exercise) => exercise.id)).toEqual(['e2', 'e1']);
  });

  it('searches the clinical description and the named additional tags', () => {
    expect(searchExercises(EXERCISES, 'prostowniki').map((exercise) => exercise.id)).toEqual(['e5']);
    expect(searchExercises(EXERCISES, 'pośladki').map((exercise) => exercise.id)).toEqual(['e5']);
  });

  it('returns nothing for an empty query and respects the limit', () => {
    expect(searchExercises(EXERCISES, ' ')).toEqual([]);
    expect(searchExercises(EXERCISES, 'kolano', 1)).toHaveLength(1);
  });
});

describe('withTagNames', () => {
  it('turns the tag ids of the picker list into names the search can match', () => {
    const fromPicker = [
      { id: 'e6', name: 'Unoszenie bioder', mainTags: ['tag-1'], additionalTags: ['tag-2', 'tag-x'] },
    ];
    expect(searchExercises(fromPicker, 'pośladków')).toEqual([]);

    const named = withTagNames(fromPicker, [
      { id: 'tag-1', name: 'Biodro' },
      { id: 'tag-2', name: 'Pośladki' },
    ]);
    expect(named[0]).toMatchObject({ mainTags: [{ name: 'Biodro' }], additionalTags: [{ name: 'Pośladki' }, 'tag-x'] });
    expect(searchExercises(named, 'pośladków').map((exercise) => exercise.id)).toEqual(['e6']);
  });

  it('keeps the list as it is while the tags are not here', () => {
    const fromPicker = [{ id: 'e6', name: 'Unoszenie bioder', mainTags: ['tag-1'] }];
    expect(withTagNames(fromPicker, [])).toBe(fromPicker);
  });
});

describe('pickExercisesById', () => {
  it('keeps the requested order and drops unknown ids', () => {
    expect(pickExercisesById(EXERCISES, ['e3', 'missing', 'e1']).map((exercise) => exercise.id)).toEqual(['e3', 'e1']);
  });
});
