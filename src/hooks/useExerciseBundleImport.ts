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

export function useExerciseBundleImport() {
  return useMutation<ImportExerciseBundleData, ImportExerciseBundleVariables>(
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
}
