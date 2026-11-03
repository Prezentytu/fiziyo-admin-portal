import { describe, expect, it } from 'vitest';

import {
  AI_DUPLICATE_NAMES_LIMIT,
  findSimilarExercises,
  prepareExerciseNames,
  rankExerciseNamesForDuplicateCheck,
} from '../exerciseDuplicateCandidates';

const exercise = (id: string, name: string) => ({ id, name });

describe('findSimilarExercises', () => {
  const library = prepareExerciseNames([
    exercise('1', 'Hip Thrust z hantlem'),
    exercise('2', 'Przysiad'),
    exercise('3', 'Wykrok w przód'),
    exercise('4', 'Hip Thrust'),
  ]);

  it('finds substring and typo matches', () => {
    expect(findSimilarExercises('hip', library).map((item) => item.id)).toEqual(['1', '4']);
    expect(findSimilarExercises('hip trust', library).map((item) => item.id)).toContain('4');
  });

  it('finds a typo in a large library and still skips names of a very different length', () => {
    const filler = Array.from({ length: 5000 }, (_, index) => exercise(`f-${index}`, `Zupełnie inne ćwiczenie numer ${index}`));
    const large = prepareExerciseNames([...filler, exercise('typo', 'Martwy ciąg')]);

    expect(findSimilarExercises('martwy ciag', large).map((item) => item.id)).toEqual([]);
    expect(findSimilarExercises('martwy cig', large).map((item) => item.id)).toEqual(['typo']);
  });

  it('skips the exact name and short input', () => {
    expect(findSimilarExercises('Przysiad', library)).toEqual([]);
    expect(findSimilarExercises('p', library)).toEqual([]);
  });
});

describe('rankExerciseNamesForDuplicateCheck', () => {
  it('sends the closest names first so the prompt cap keeps the relevant ones in a large library', () => {
    const filler = Array.from({ length: 5000 }, (_, index) => exercise(`f-${index}`, `Aaa ćwiczenie ${index}`));
    const library = [...filler, exercise('target', 'Hip Thrust'), exercise('exact', 'Hip trust')];

    const names = rankExerciseNamesForDuplicateCheck('hip trust', prepareExerciseNames(library));

    expect(names).toHaveLength(AI_DUPLICATE_NAMES_LIMIT);
    expect(names.slice(0, 2)).toEqual(['Hip trust', 'Hip Thrust']);
  });

  it('returns nothing for short input', () => {
    expect(rankExerciseNamesForDuplicateCheck('h', prepareExerciseNames([exercise('1', 'Hip Thrust')]))).toEqual([]);
  });
});
