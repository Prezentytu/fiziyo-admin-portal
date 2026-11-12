import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { GraphQLError, print } from 'graphql';
import { describe, expect, it } from 'vitest';

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

function fieldsOf(names: string[]) {
  return {
    result: {
      data: {
        __type: { __typename: '__Type', fields: names.map((name) => ({ __typename: '__Field', name })) },
      },
    },
  };
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
    ['API nie zna typu wyniku', { result: { data: { __type: null } } }],
    ['introspekcja wyłączona', { result: { errors: [new GraphQLError('Introspection is not allowed for the current request.')] } }],
    ['HTTP 400 bez danych', { error: new Error('Response not successful: Received status code 400') }],
  ])('%s: import idzie raz, tą samą mutacją co na main', async (_name, outcome) => {
    const { response, hook } = await runImport([resultFields(outcome), plainImport]);

    expect(response?.data?.importExerciseBundle.exercisesUpserted).toBe(3);
    expect(response?.data?.importExerciseBundle.mediaCopy).toBeUndefined();
    expect(hook.current[1].loading).toBe(false);
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
          { request: { query: IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION, variables }, error: new Error('timeout') },
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
