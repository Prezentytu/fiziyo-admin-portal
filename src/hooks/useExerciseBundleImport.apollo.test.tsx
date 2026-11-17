import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { ServerError } from '@apollo/client/errors';
import { Observable } from '@apollo/client/utilities';
import { GraphQLError, print } from 'graphql';
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { describe, expect, it } from 'vitest';

import { IMPORT_EXERCISE_BUNDLE_MUTATION } from '@/graphql/mutations/exercises.mutations';
import { HOTCHOCOLATE_RESPONSES } from '@/lib/graphql/hotChocolateResponses.fixture';

import { useExerciseBundleImport } from './useExerciseBundleImport';

// Prawdziwy klient Apollo i atrapa serwera na poziomie linku z błędami zapisanymi z HotChocolate 15.1.14.

const variables = { organizationId: 'org-1', json: '{"exercises":[]}', asGlobal: false };

const importResult = {
  __typename: 'ExerciseBundleImportResultDto',
  success: true,
  fileKind: 'exercises',
  exercisesUpserted: 3,
  mediaReplaced: 0,
  tagsUpserted: 0,
  categoriesUpserted: 0,
  tagLinks: 0,
  relations: 0,
  skipped: 0,
  errors: [],
  warnings: [],
};

const mediaCopy = {
  __typename: 'ExerciseBundleMediaCopyDto',
  copied: 1,
  alreadyPresent: 0,
  planned: 0,
  kept: 0,
  failed: 0,
  deferred: 0,
  notCopied: 0,
  items: [
    {
      __typename: 'ExerciseBundleMediaCopyItemDto',
      sourceUrl: 'https://dev.example.test/a.jpg',
      targetUrl: 'https://prod.example.test/a.jpg',
      outcome: 'COPIED',
      reason: null,
    },
  ],
};

type Outcome = { result: ApolloLink.Result } | { error: Error };

const importWithReport: Outcome = { result: { data: { importExerciseBundle: { ...importResult, mediaCopy } } } };

/** Błędy z zapisanej prawdziwej odpowiedzi HotChocolate 15.1.14. */
function recorded(name: keyof typeof HOTCHOCOLATE_RESPONSES): Outcome {
  const { errors } = JSON.parse(HOTCHOCOLATE_RESPONSES[name].body) as {
    errors: Array<{ message: string; path?: string[]; extensions?: Record<string, unknown> }>;
  };
  return {
    result: { errors: errors.map(({ message, path, extensions }) => new GraphQLError(message, { path, extensions })) },
  };
}

function http(status: number): Outcome {
  return {
    error: new ServerError(`Response not successful: Received status code ${status}`, {
      response: new Response('{}', { status }),
      bodyText: '{}',
    }),
  };
}

function server(outcome: Outcome) {
  const sent: string[] = [];
  const link = new ApolloLink((operation) => {
    sent.push(operation.operationName ?? '');
    return new Observable<ApolloLink.Result>((observer) => {
      if ('error' in outcome) {
        observer.error(outcome.error);
      } else {
        observer.next(outcome.result);
        observer.complete();
      }
    });
  });
  const client = new ApolloClient({ cache: new InMemoryCache(), link });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  return { sent, wrapper };
}

describe('import katalogu', () => {
  it('mutacja importu niesie raport kopii mediów razem z deferred i notCopied', () => {
    const document = print(IMPORT_EXERCISE_BUNDLE_MUTATION);
    for (const field of ['mediaCopy', 'deferred', 'notCopied']) expect(document).toContain(field);
  });

  it('jedno wysłanie zapisu, bez sondy, odpowiedź z raportem', async () => {
    const backend = server(importWithReport);
    const { result } = renderHook(() => useExerciseBundleImport(), { wrapper: backend.wrapper });

    let response: Awaited<ReturnType<(typeof result.current)[0]>> | undefined;
    await act(async () => {
      response = await result.current[0]({ variables });
    });

    expect(response?.data?.importExerciseBundle.mediaCopy).toMatchObject({ copied: 1 });
    expect(backend.sent).toEqual(['ImportExerciseBundle']);
    expect(result.current[1].loading).toBe(false);
  });

  it.each([
    ['błąd sieci', { error: new TypeError('Failed to fetch') }],
    ['HTTP 500', http(500)],
    ['HTTP 504', http(504)],
    ['przekroczony limit wykonania HC0045 (po zapisie)', recorded('timeout')],
    ['nieznane pole (walidacja schematu)', recorded('unknownField')],
    ['brak autoryzacji', recorded('unauth')],
    ['wyjątek resolvera', recorded('resolver')],
  ] satisfies Array<[string, Outcome]>)(
    'błąd importu (%s): pokazany użytkownikowi, zapis wysłany dokładnie raz',
    async (_name, failure) => {
      const backend = server(failure);
      const { result } = renderHook(() => useExerciseBundleImport(), { wrapper: backend.wrapper });

      await act(async () => {
        await expect(result.current[0]({ variables })).rejects.toBeDefined();
      });

      expect(backend.sent).toEqual(['ImportExerciseBundle']);
      expect(result.current[1].loading).toBe(false);
    }
  );
});
