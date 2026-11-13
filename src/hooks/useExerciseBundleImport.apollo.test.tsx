import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { ServerError } from '@apollo/client/errors';
import { Observable } from '@apollo/client/utilities';
import { GraphQLError, print } from 'graphql';
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { describe, expect, it, vi } from 'vitest';

import {
  IMPORT_EXERCISE_BUNDLE_MUTATION,
  IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION,
  PROBE_EXERCISE_BUNDLE_MEDIA_COPY_MUTATION,
} from '@/graphql/mutations/exercises.mutations';
import { HOTCHOCOLATE_RESPONSES } from '@/lib/graphql/hotChocolateResponses.fixture';

import { useExerciseBundleImport } from './useExerciseBundleImport';

// Prawdziwy klient Apollo i atrapa serwera na poziomie linku. Atrapa odtwarza HotChocolate 15.1.14 poza
// Development: introspekcja (`__type`) kończy się błędem HC0046. Sonda wyboru mutacji nie może jej używać.

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

type Outcome = { result: ApolloLink.Result } | { error: Error } | 'hang';

const plainImport: Outcome = { result: { data: { importExerciseBundle: importResult } } };
const importWithReport: Outcome = { result: { data: { importExerciseBundle: { ...importResult, mediaCopy } } } };
/** Sonda na API z raportem: pole walidowane, resolver pominięty przez `@skip`, odpowiedź bez błędów. */
const probeAccepted: Outcome = { result: { data: {} } };

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

const introspectionForbidden: Outcome = {
  result: {
    errors: [
      new GraphQLError('Introspection is not allowed for the current request.', { extensions: { code: 'HC0046' } }),
    ],
  },
};

interface Backend {
  probe: Outcome;
  withReport?: Outcome;
  plain?: Outcome;
}

interface Sent {
  name: string;
  introspection: boolean;
  signal?: AbortSignal;
}

function emit(outcome: Outcome, signal?: AbortSignal) {
  return new Observable<ApolloLink.Result>((observer) => {
    const abort = () => observer.error(new DOMException('The operation was aborted.', 'AbortError'));
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort);
    if (outcome !== 'hang') {
      if ('error' in outcome) {
        observer.error(outcome.error);
      } else {
        observer.next(outcome.result);
        observer.complete();
      }
    }
    return () => signal?.removeEventListener('abort', abort);
  });
}

function server(backend: Backend) {
  const sent: Sent[] = [];
  const link = new ApolloLink((operation) => {
    const name = operation.operationName ?? '';
    const signal = operation.getContext().fetchOptions?.signal as AbortSignal | undefined;
    const introspection = /__type\b/.test(print(operation.query));
    sent.push({ name, introspection, signal });
    if (introspection) return emit(introspectionForbidden, signal);
    if (name === 'ProbeExerciseBundleMediaCopy') return emit(backend.probe, signal);
    if (name === 'ImportExerciseBundleWithMediaCopy') return emit(backend.withReport ?? importWithReport, signal);
    return emit(backend.plain ?? plainImport, signal);
  });
  const client = new ApolloClient({ cache: new InMemoryCache(), link });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  );
  return {
    sent,
    wrapper,
    /** Wysłane zapisy: sonda nie jest zapisem. */
    writes: () => sent.filter(({ name }) => name.startsWith('ImportExerciseBundle')).map(({ name }) => name),
  };
}

describe('dokumenty importu', () => {
  it('mutacja importu z main nie niesie pola mediaCopy', () => {
    expect(print(IMPORT_EXERCISE_BUNDLE_MUTATION)).not.toContain('mediaCopy');
    expect(print(IMPORT_EXERCISE_BUNDLE_WITH_MEDIA_COPY_MUTATION)).toContain('mediaCopy');
  });

  it('sonda: ta sama mutacja z raportem, pole główne pominięte @skip, bez introspekcji', () => {
    const probe = print(PROBE_EXERCISE_BUNDLE_MEDIA_COPY_MUTATION);
    expect(probe).toContain('importExerciseBundle');
    expect(probe).toContain('@skip(if: true)');
    for (const field of ['mediaCopy', 'deferred', 'notCopied']) expect(probe).toContain(field);
    expect(probe).not.toMatch(/__type\b/);
    expect(probe).not.toContain('$');
  });
});

describe('wybór mutacji bez introspekcji (HotChocolate poza Development odrzuca __type z HC0046)', () => {
  it('API z raportem: import niesie raport, sonda nie używa introspekcji i nie jest zapisem', async () => {
    const backend = server({ probe: probeAccepted });
    const { result } = renderHook(() => useExerciseBundleImport(), { wrapper: backend.wrapper });

    let response: Awaited<ReturnType<(typeof result.current)[0]>> | undefined;
    await act(async () => {
      response = await result.current[0]({ variables });
    });

    expect(response?.data?.importExerciseBundle.mediaCopy).toMatchObject({ copied: 1 });
    expect(backend.sent.some(({ introspection }) => introspection)).toBe(false);
    expect(backend.sent.map(({ name }) => name)).toEqual([
      'ProbeExerciseBundleMediaCopy',
      'ImportExerciseBundleWithMediaCopy',
    ]);
    expect(backend.writes()).toEqual(['ImportExerciseBundleWithMediaCopy']);
    expect(result.current[1].loading).toBe(false);
  });

  it.each([
    ['nieznane pole mediaCopy (walidacja, API z main)', recorded('unknownField')],
    ['nieznany argument (walidacja)', recorded('unknownArg')],
    ['błąd sieci', { error: new TypeError('Failed to fetch') }],
    ['HTTP 500', http(500)],
    ['HTTP 504', http(504)],
    ['HTTP 400 bez treści GraphQL', http(400)],
    ['HC0045 (limit wykonania)', recorded('timeout')],
    ['brak autoryzacji (401 jako błąd GraphQL)', recorded('unauth')],
    ['wyjątek resolvera', recorded('resolver')],
  ] satisfies Array<[string, Outcome]>)(
    'sonda: %s = stara mutacja, jedno wysłanie zapisu',
    async (_name, probe) => {
      const backend = server({ probe });
      const { result } = renderHook(() => useExerciseBundleImport(), { wrapper: backend.wrapper });

      let response: Awaited<ReturnType<(typeof result.current)[0]>> | undefined;
      await act(async () => {
        response = await result.current[0]({ variables });
      });

      expect(response?.data?.importExerciseBundle.exercisesUpserted).toBe(3);
      expect(response?.data?.importExerciseBundle.mediaCopy).toBeUndefined();
      expect(backend.writes()).toEqual(['ImportExerciseBundle']);
      expect(backend.sent.some(({ introspection }) => introspection)).toBe(false);
    }
  );

  it('sonda idzie przy każdym imporcie: po wycofaniu raportu następny import idzie starą mutacją', async () => {
    const backend = { probe: probeAccepted } as Backend;
    const { sent, wrapper, writes } = server(backend);
    const { result } = renderHook(() => useExerciseBundleImport(), { wrapper });

    await act(async () => {
      await result.current[0]({ variables });
    });
    backend.probe = recorded('unknownField');
    await act(async () => {
      await result.current[0]({ variables });
    });

    expect(sent.map(({ name }) => name)).toEqual([
      'ProbeExerciseBundleMediaCopy',
      'ImportExerciseBundleWithMediaCopy',
      'ProbeExerciseBundleMediaCopy',
      'ImportExerciseBundle',
    ]);
    expect(writes()).toEqual(['ImportExerciseBundleWithMediaCopy', 'ImportExerciseBundle']);
  });

  it('zawieszona sonda jest przerwana po limicie i nie trzyma połączenia; import idzie starą mutacją', async () => {
    const backend = server({ probe: 'hang' });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result } = renderHook(() => useExerciseBundleImport(), { wrapper: backend.wrapper });
      let pending: Promise<unknown> | undefined;
      act(() => {
        pending = result.current[0]({ variables });
      });
      const probeSignal = backend.sent[0]?.signal;
      expect(probeSignal?.aborted).toBe(false);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
        await pending;
      });
      expect(probeSignal?.aborted).toBe(true);
      expect(backend.writes()).toEqual(['ImportExerciseBundle']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sonda, która odpowiedziała, nie jest przerywana po limicie', async () => {
    const backend = server({ probe: probeAccepted });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result } = renderHook(() => useExerciseBundleImport(), { wrapper: backend.wrapper });
      await act(async () => {
        await result.current[0]({ variables });
        await vi.advanceTimersByTimeAsync(6000);
      });
      expect(backend.sent[0]?.signal?.aborted).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['błąd sieci', { error: new TypeError('Failed to fetch') }],
    ['HTTP 500', http(500)],
    ['HTTP 504', http(504)],
    ['HTTP 400 bez treści GraphQL', http(400)],
    ['przekroczony limit wykonania HC0045 (po zapisie)', recorded('timeout')],
    ['nieznane pole (walidacja schematu)', recorded('unknownField')],
    ['nieznany argument (walidacja schematu)', recorded('unknownArg')],
    ['brak autoryzacji', recorded('unauth')],
    ['wyjątek resolvera', recorded('resolver')],
  ] satisfies Array<[string, Outcome]>)(
    'błąd mutacji z raportem (%s): pokazany użytkownikowi, zapis wysłany dokładnie raz',
    async (_name, failure) => {
      const backend = server({ probe: probeAccepted, withReport: failure });
      const { result } = renderHook(() => useExerciseBundleImport(), { wrapper: backend.wrapper });

      await act(async () => {
        await expect(result.current[0]({ variables })).rejects.toBeDefined();
      });

      expect(backend.writes()).toEqual(['ImportExerciseBundleWithMediaCopy']);
      expect(result.current[1].loading).toBe(false);
    }
  );
});
