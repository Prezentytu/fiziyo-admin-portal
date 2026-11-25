import { InMemoryCache } from '@apollo/client';
import { describe, expect, it } from 'vitest';

import { GET_EXERCISE_NAME_VOCABULARY_QUERY } from '@/graphql/queries/exerciseNameReview.queries';
import type { GetExerciseNameVocabularyResponse } from '@/graphql/types/exerciseNameReview.types';

import { writeSavedVocabulary } from '../vocabularyCache';

function term(id: string, preferred: string, avoid: string[] = []) {
  return { __typename: 'ExerciseNameVocabularyTerm', id, preferred, avoid };
}

describe('writeSavedVocabulary', () => {
  it('replaces the cached vocabulary list with the saved one (new ids after RemoveRange + AddRange)', () => {
    const cache = new InMemoryCache();
    cache.writeQuery<GetExerciseNameVocabularyResponse>({
      query: GET_EXERCISE_NAME_VOCABULARY_QUERY,
      data: { exerciseNameVocabulary: [term('1', 'kettlebell', ['odważnik kulowy'])] },
    });

    writeSavedVocabulary(cache, [term('2', 'kettlebell', ['odważnik kulowy']), term('3', 'taśma TRX')]);

    const cached = cache.readQuery<GetExerciseNameVocabularyResponse>({ query: GET_EXERCISE_NAME_VOCABULARY_QUERY });
    expect(cached?.exerciseNameVocabulary.map((t) => t.preferred)).toEqual(['kettlebell', 'taśma TRX']);
    expect(cached?.exerciseNameVocabulary.map((t) => t.id)).toEqual(['2', '3']);
  });
});
