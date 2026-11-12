'use client';

import { useCallback, useState } from 'react';
import type { ApolloClient } from '@apollo/client';
import { useApolloClient, useMutation } from '@apollo/client/react';

import {
  GET_EXERCISE_BUNDLE_IMPORT_RESULT_FIELDS_QUERY,
  IMPORT_EXERCISE_BUNDLE_MUTATION,
  IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION,
  type ImportExerciseBundleData,
  type ImportExerciseBundleVariables,
} from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';

interface ImportResultFieldsResponse {
  __type?: { fields?: ReadonlyArray<{ name?: string | null } | null> | null } | null;
}

/**
 * Czy API zna raport kopii mediów (fizjo-app#432). Pytanie o schemat, nie próba mutacji: import nie może pójść
 * dwa razy. Każda niepewność (błąd, wyłączona introspekcja, brak pola) = import jak dotąd, bez raportu.
 */
async function supportsMediaCopyReport(client: ApolloClient): Promise<boolean> {
  try {
    const { data } = await client.query<ImportResultFieldsResponse>({
      query: GET_EXERCISE_BUNDLE_IMPORT_RESULT_FIELDS_QUERY,
      errorPolicy: 'ignore',
    });
    return data?.__type?.fields?.some((field) => field?.name === 'mediaCopy') === true;
  } catch {
    return false;
  }
}

const MUTATION_OPTIONS = {
  refetchQueries: [
    GET_ORGANIZATION_EXERCISES_QUERY,
    GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY,
    GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY,
  ],
  awaitRefetchQueries: false,
};

export function useExerciseBundleImport() {
  const client = useApolloClient();
  const [importPlain] = useMutation<ImportExerciseBundleData, ImportExerciseBundleVariables>(
    IMPORT_EXERCISE_BUNDLE_MUTATION,
    MUTATION_OPTIONS
  );
  const [importWithMediaCopy] = useMutation<ImportExerciseBundleData, ImportExerciseBundleVariables>(
    IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION,
    MUTATION_OPTIONS
  );
  const [loading, setLoading] = useState(false);

  const importBundle = useCallback(
    async ({ variables }: { variables: ImportExerciseBundleVariables }) => {
      setLoading(true);
      try {
        const runImport = (await supportsMediaCopyReport(client)) ? importWithMediaCopy : importPlain;
        return await runImport({ variables });
      } finally {
        setLoading(false);
      }
    },
    [client, importPlain, importWithMediaCopy]
  );

  return [importBundle, { loading }] as const;
}
