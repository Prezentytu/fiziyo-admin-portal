'use client';

import { useMutation } from '@apollo/client/react';

import {
  IMPORT_EXERCISE_BUNDLE_MUTATION,
  type ImportExerciseBundleData,
  type ImportExerciseBundleVariables,
} from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';

/**
 * Import katalogu z raportem kopii mediów. Błąd mutacji wraca do użytkownika bez drugiego wysłania: błąd po zapisie
 * (np. przekroczony limit wykonania) wygląda jak odrzucenie, a import nie może pójść dwa razy.
 */
export function useExerciseBundleImport() {
  const [importBundle, { loading }] = useMutation<ImportExerciseBundleData, ImportExerciseBundleVariables>(
    IMPORT_EXERCISE_BUNDLE_MUTATION,
    {
      refetchQueries: [
        GET_ORGANIZATION_EXERCISES_QUERY,
        GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY,
        GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY,
      ],
      awaitRefetchQueries: false,
    }
  );

  return [importBundle, { loading }] as const;
}
