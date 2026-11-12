import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ServerError } from '@apollo/client/errors';
import { GraphQLError, print } from 'graphql';
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { MockLink } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  GET_EXERCISE_BUNDLE_IMPORT_RESULT_FIELDS_QUERY,
  IMPORT_EXERCISE_BUNDLE_MUTATION,
  IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION,
} from '@/graphql/mutations/exercises.mutations';

import { useExerciseBundleImport } from './useExerciseBundleImport';

// Prawdziwy klient Apollo: API sprzed fizjo-app#432 (bez `mediaCopy`) i API z raportem kopii mediów.
// Każda atrapa mutacji odpowiada raz, więc drugi import tego samego pliku skończyłby się błędem.

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

// The import exactly as on main: same document, same variables.
const plainImport: MockLink.MockedResponse = {
  request: { query: IMPORT_EXERCISE_BUNDLE_MUTATION, variables },
  result: { data: { importExerciseBundle: importResult } },
};

const importWithReport: MockLink.MockedResponse = {
  request: { query: IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION, variables },
  result: { data: { importExerciseBundle: { ...importResult, mediaCopy } } },
};

function resultFields(outcome: Pick<MockLink.MockedResponse, 'result' | 'error'>): MockLink.MockedResponse {
  return { request: { query: GET_EXERCISE_BUNDLE_IMPORT_RESULT_FIELDS_QUERY }, ...outcome };
}

const MEDIA_COPY_DTO_FIELDS = ['copied', 'failed', 'deferred', 'notCopied', 'items'];

function typeOf(names: string[]) {
  return { __typename: '__Type', fields: names.map((name) => ({ __typename: '__Field', name })) };
}

/** Pytanie o schemat: pola wyniku importu i pola raportu kopii mediów. */
function fieldsOf(names: string[], mediaCopyFields: string[] | null = MEDIA_COPY_DTO_FIELDS) {
  return {
    result: {
      data: { __type: typeOf(names), mediaCopyType: mediaCopyFields ? typeOf(mediaCopyFields) : null },
    },
  };
}

function http(status: number): ServerError {
  return new ServerError(`Response not successful: Received status code ${status}`, {
    response: new Response('{}', { status }),
    bodyText: '{}',
  });
}

async function runImport(mocks: MockLink.MockedResponse[]) {
  const wrapper = ({ children }: { children: ReactNode }) => <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  const { result } = renderHook(() => useExerciseBundleImport(), { wrapper });
  let response: Awaited<ReturnType<(typeof result.current)[0]>> | undefined;
  await act(async () => {
    response = await result.current[0]({ variables });
  });
  return { response, hook: result };
}

describe('import katalogu na API bez raportu kopii mediów (przed fizjo-app#432)', () => {
  it('mutacja importu z main nie niesie pola mediaCopy', () => {
    expect(print(IMPORT_EXERCISE_BUNDLE_MUTATION)).not.toContain('mediaCopy');
  });

  it.each([
    ['wynik importu bez pola mediaCopy', fieldsOf(['success', 'fileKind', 'errors', 'warnings'])],
    ['API nie zna typu wyniku', { result: { data: { __type: null, mediaCopyType: null } } }],
    [
      'raport bez liczników odłożonych i niekopiowanych',
      fieldsOf(['success', 'mediaCopy'], ['copied', 'failed', 'items']),
    ],
    [
      'introspekcja wyłączona',
      { result: { errors: [new GraphQLError('Introspection is not allowed for the current request.')] } },
    ],
    ['HTTP 400 bez danych', { error: new Error('Response not successful: Received status code 400') }],
  ])('%s: import idzie raz, tą samą mutacją co na main', async (_name, outcome) => {
    const { response, hook } = await runImport([resultFields(outcome), plainImport]);

    expect(response?.data?.importExerciseBundle.exercisesUpserted).toBe(3);
    expect(response?.data?.importExerciseBundle.mediaCopy).toBeUndefined();
    expect(hook.current[1].loading).toBe(false);
  });
});

function lookup(mocks: MockLink.MockedResponse[]) {
  const asked: string[] = [];
  const recorder = new ApolloLink((operation, forward) => {
    asked.push(operation.operationName ?? '');
    return forward(operation);
  });
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: ApolloLink.from([recorder, new MockLink(mocks)]),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  return { asked, wrapper };
}

describe('wynik pytania o schemat nie zostaje na całą sesję', () => {
  it('pyta przy każdym imporcie: po wycofaniu raportu na API następny import idzie starą mutacją', async () => {
    const { asked, wrapper } = lookup([
      resultFields(fieldsOf(['success', 'mediaCopy'])),
      importWithReport,
      resultFields(fieldsOf(['success'], null)),
      plainImport,
    ]);
    const { result } = renderHook(() => useExerciseBundleImport(), { wrapper });

    await act(async () => {
      await result.current[0]({ variables });
    });
    await act(async () => {
      await result.current[0]({ variables });
    });

    expect(asked).toEqual([
      'GetExerciseBundleImportResultFields',
      'ImportExerciseBundleWithMediaCopy',
      'GetExerciseBundleImportResultFields',
      'ImportExerciseBundle',
    ]);
  });

  it.each([
    ['HTTP 400', { error: http(400) }],
    [
      'błąd walidacji dokumentu',
      {
        result: {
          errors: [new GraphQLError('The field `deferred` does not exist on the type `ExerciseBundleMediaCopyDto`.')],
        },
      },
    ],
  ])('nowa mutacja odrzucona walidacją schematu (%s): jedna próba starą mutacją', async (_name, rejection) => {
    const { asked, wrapper } = lookup([
      resultFields(fieldsOf(['success', 'mediaCopy'])),
      { request: { query: IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION, variables }, ...rejection },
      plainImport,
    ]);
    const { result } = renderHook(() => useExerciseBundleImport(), { wrapper });

    let response: Awaited<ReturnType<(typeof result.current)[0]>> | undefined;
    await act(async () => {
      response = await result.current[0]({ variables });
    });

    expect(response?.data?.importExerciseBundle.exercisesUpserted).toBe(3);
    expect(response?.data?.importExerciseBundle.mediaCopy).toBeUndefined();
    expect(asked.filter((name) => name === 'ImportExerciseBundle')).toHaveLength(1);
    expect(asked.filter((name) => name === 'ImportExerciseBundleWithMediaCopy')).toHaveLength(1);
  });

  it.each([
    ['błąd sieci', { error: new TypeError('Failed to fetch') }],
    ['HTTP 500', { error: http(500) }],
    ['HTTP 504', { error: http(504) }],
    [
      'błąd wykonania ze ścieżką pola',
      { result: { errors: [new GraphQLError('boom', { path: ['importExerciseBundle'] })] } },
    ],
  ])('inny błąd mutacji (%s): bez ponowienia, import nie idzie drugi raz', async (_name, failure) => {
    const { asked, wrapper } = lookup([
      resultFields(fieldsOf(['success', 'mediaCopy'])),
      { request: { query: IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION, variables }, ...failure },
      plainImport,
    ]);
    const { result } = renderHook(() => useExerciseBundleImport(), { wrapper });

    await act(async () => {
      await expect(result.current[0]({ variables })).rejects.toBeDefined();
    });

    expect(asked.filter((name) => name.startsWith('ImportExerciseBundle'))).toEqual([
      'ImportExerciseBundleWithMediaCopy',
    ]);
  });

  it('zawieszone pytanie o schemat nie wstrzymuje importu: po limicie idzie stara mutacja', async () => {
    const { asked, wrapper } = lookup([
      {
        request: { query: GET_EXERCISE_BUNDLE_IMPORT_RESULT_FIELDS_QUERY },
        ...fieldsOf(['success', 'mediaCopy']),
        delay: 30_000,
      },
      plainImport,
    ]);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result } = renderHook(() => useExerciseBundleImport(), { wrapper });
      let pending: Promise<unknown> | undefined;
      act(() => {
        pending = result.current[0]({ variables });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
        await pending;
      });
      expect(asked).toContain('ImportExerciseBundle');
      expect(asked).not.toContain('ImportExerciseBundleWithMediaCopy');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('import katalogu na API z raportem kopii mediów', () => {
  it('import idzie raz i niesie raport', async () => {
    const { response } = await runImport([resultFields(fieldsOf(['success', 'mediaCopy'])), importWithReport]);

    expect(response?.data?.importExerciseBundle.mediaCopy).toMatchObject({ copied: 1 });
  });

  it('błąd importu z raportem nie uruchamia drugiego importu', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider
        mocks={[
          resultFields(fieldsOf(['success', 'mediaCopy'])),
          {
            request: { query: IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION, variables },
            error: new Error('timeout'),
          },
          plainImport,
        ]}
      >
        {children}
      </MockedProvider>
    );
    const { result } = renderHook(() => useExerciseBundleImport(), { wrapper });

    await act(async () => {
      await expect(result.current[0]({ variables })).rejects.toThrow('timeout');
    });
    expect(result.current[1].loading).toBe(false);
  });
});
