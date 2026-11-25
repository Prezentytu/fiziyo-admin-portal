import type { ApolloCache } from '@apollo/client';

import { GET_EXERCISE_NAME_VOCABULARY_QUERY } from '@/graphql/queries/exerciseNameReview.queries';
import type {
  ExerciseNameVocabularyTerm,
  GetExerciseNameVocabularyResponse,
} from '@/graphql/types/exerciseNameReview.types';

/**
 * The save replaces the whole vocabulary (new term ids), so the query list is not refreshed by
 * normalization. Writing the saved list back keeps the editor from resetting to the old one.
 */
export function writeSavedVocabulary(
  cache: Pick<ApolloCache, 'writeQuery'>,
  saved: ExerciseNameVocabularyTerm[],
): void {
  cache.writeQuery<GetExerciseNameVocabularyResponse>({
    query: GET_EXERCISE_NAME_VOCABULARY_QUERY,
    data: { exerciseNameVocabulary: saved },
  });
}
