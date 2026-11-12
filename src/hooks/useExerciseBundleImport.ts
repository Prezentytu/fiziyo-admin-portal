'use client';

import { useCallback, useState } from 'react';
import type { ApolloClient } from '@apollo/client';
import { useApolloClient, useMutation } from '@apollo/client/react';

import {
  IMPORT_EXERCISE_BUNDLE_MUTATION,
  IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION,
  PROBE_EXERCISE_BUNDLE_MEDIA_COPY_MUTATION,
  type ImportExerciseBundleData,
  type ImportExerciseBundleVariables,
} from '@/graphql/mutations/exercises.mutations';
import { GET_ORGANIZATION_EXERCISES_QUERY } from '@/graphql/queries/exercises.queries';
import { GET_EXERCISE_TAGS_BY_ORGANIZATION_QUERY } from '@/graphql/queries/exerciseTags.queries';
import { GET_TAG_CATEGORIES_BY_ORGANIZATION_QUERY } from '@/graphql/queries/tagCategories.queries';

/** Sonda nie może wstrzymać importu ani trzymać połączenia dłużej niż ten czas; po nim jest przerwana. */
const PROBE_TIMEOUT_MS = 5000;

/**
 * Czy API zna raport kopii mediów razem z licznikami `deferred` i `notCopied` (fizjo-app#432). Sonda to ta sama
 * mutacja z `@skip(if: true)`: serwer waliduje dokument, ale nie uruchamia resolvera (zapisu nie ma). Odpowiedź bez
 * błędów = nowa mutacja. Każdy błąd (walidacja, sieć, 401, 5xx, HC0045) i brak odpowiedzi w czasie = stara mutacja.
 * Sonda idzie przy każdym imporcie, więc wdrożenie albo wycofanie backendu nie zostaje w pamięci karty.
 */
async function supportsMediaCopyReport(client: ApolloClient): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await client.mutate({
      mutation: PROBE_EXERCISE_BUNDLE_MEDIA_COPY_MUTATION,
      context: { fetchOptions: { signal: controller.signal } },
    });
    return true;
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
        // Mutację wybiera wyłącznie sonda przed wysłaniem. Każdy błąd mutacji wraca do użytkownika bez
        // drugiego wysłania: błąd po zapisie (np. przekroczony limit wykonania) wygląda jak odrzucenie, a import
        // nie może pójść dwa razy.
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
