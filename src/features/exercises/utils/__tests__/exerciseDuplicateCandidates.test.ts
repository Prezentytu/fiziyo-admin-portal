import { describe, expect, it } from 'vitest';

import {
  AI_DUPLICATE_NAMES_LIMIT,
  findSimilarExercises,
  rankExerciseNamesForDuplicateCheck,
} from '../exerciseDuplicateCandidates';

const exercise = (id: string, name: string) => ({ id, name });

describe('findSimilarExercises', () => {
  const library = [
    exercise('1', 'Hip Thrust z hantlem'),
    exercise('2', 'Przysiad'),
    exercise('3', 'Wykrok w przód'),
    exercise('4', 'Hip Thrust'),
  ];

  it('finds substring and typo matches', () => {
    expect(findSimilarExercises('hip', library).map((item) => item.id)).toEqual(['1', '4']);
    expect(findSimilarExercises('hip trust', library).map((item) => item.id)).toContain('4');
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

    const names = rankExerciseNamesForDuplicateCheck('hip trust', library);

    expect(names).toHaveLength(AI_DUPLICATE_NAMES_LIMIT);
    expect(names.slice(0, 2)).toEqual(['Hip trust', 'Hip Thrust']);
  });

  it('returns nothing for short input', () => {
    expect(rankExerciseNamesForDuplicateCheck('h', [exercise('1', 'Hip Thrust')])).toEqual([]);
  });
});
