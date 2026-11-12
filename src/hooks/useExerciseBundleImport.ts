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
import { isSchemaValidationError } from '@/lib/graphql/isSchemaValidationError';

interface TypeFields {
  fields?: ReadonlyArray<{ name?: string | null } | null> | null;
}

interface ImportResultFieldsResponse {
  __type?: TypeFields | null;
  mediaCopyType?: TypeFields | null;
}

/** Pytanie o schemat nie może wstrzymać importu dłużej niż ten czas; po nim import idzie jak na main. */
const SCHEMA_QUESTION_TIMEOUT_MS = 5000;

function hasFields(type: TypeFields | null | undefined, names: readonly string[]): boolean {
  return names.every((name) => type?.fields?.some((field) => field?.name === name) === true);
}

/**
 * Czy API zna raport kopii mediów razem z licznikami `deferred` i `notCopied` (fizjo-app#432). Pytanie o schemat
 * idzie przy każdym imporcie (`network-only`), więc wdrożenie albo wycofanie backendu nie zostaje w pamięci karty.
 * Każda niepewność (błąd, wyłączona introspekcja, brak pola, brak odpowiedzi w czasie) = import jak dotąd, bez raportu.
 */
async function supportsMediaCopyReport(client: ApolloClient): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const question = client
      .query<ImportResultFieldsResponse>({
        query: GET_EXERCISE_BUNDLE_IMPORT_RESULT_FIELDS_QUERY,
        fetchPolicy: 'network-only',
        errorPolicy: 'ignore',
      })
      .then(
        ({ data }) =>
          hasFields(data?.__type, ['mediaCopy']) && hasFields(data?.mediaCopyType, ['deferred', 'notCopied'])
      );
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), SCHEMA_QUESTION_TIMEOUT_MS);
    });
    return await Promise.race([question, timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
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
        if (!(await supportsMediaCopyReport(client))) return await importPlain({ variables });
        try {
          return await importWithMediaCopy({ variables });
        } catch (error) {
          // Backend zmienił się po pytaniu o schemat i nie zna dokumentu: walidacja jest przed wykonaniem, więc nic
          // nie zapisano i jedna próba starą mutacją nie dubluje importu. Każdy inny błąd wraca bez ponowienia.
          if (!isSchemaValidationError(error)) throw error;
          return await importPlain({ variables });
        }
      } finally {
        setLoading(false);
      }
    },
    [client, importPlain, importWithMediaCopy]
  );

  return [importBundle, { loading }] as const;
}
