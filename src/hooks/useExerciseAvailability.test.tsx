import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';

import { GET_EXERCISE_AVAILABILITY_QUERY } from '@/graphql/queries/exercises.queries';

import { ServerError } from '@apollo/client/errors';

import { HOTCHOCOLATE_RESPONSES } from '@/lib/graphql/hotChocolateResponses.fixture';
import { isDuplicateAllowed, useExerciseAvailability } from './useExerciseAvailability';

// Prawdziwy klient Apollo: API z polem `availability` (po fizjo-app#388) i bez niego (dzisiejszy main).

// The screen's own query on the same root field; it must load whatever happens to the availability query.
const GET_EXERCISE_NAME_QUERY = gql`
  query GetExerciseNameForTest($id: String!) {
    exerciseById(id: $id) {
      id
      name
    }
  }
`;

const exerciseQuery: MockLink.MockedResponse = {
  request: { query: GET_EXERCISE_NAME_QUERY, variables: { id: 'ex-1' } },
  result: { data: { exerciseById: { __typename: 'Exercise', id: 'ex-1', name: 'Mostek' } } },
};

function availabilityMock(
  outcome: Pick<MockLink.MockedResponse, 'result' | 'error' | 'delay'>
): MockLink.MockedResponse {
  return { request: { query: GET_EXERCISE_AVAILABILITY_QUERY, variables: { id: 'ex-1' } }, ...outcome };
}

function renderScreen(mocks: MockLink.MockedResponse[]) {
  const wrapper = ({ children }: { children: ReactNode }) => <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  return renderHook(
    () => ({
      exercise: useQuery<{ exerciseById: { id: string; name: string } }>(GET_EXERCISE_NAME_QUERY, {
        variables: { id: 'ex-1' },
      }),
      availability: useExerciseAvailability('ex-1'),
    }),
    { wrapper }
  );
}

describe('useExerciseAvailability', () => {
  it('oddaje dostępność, gdy API zna pole', async () => {
    const { result } = renderScreen([
      exerciseQuery,
      availabilityMock({
        result: { data: { exerciseById: { __typename: 'Exercise', id: 'ex-1', availability: 'DEMO' } } },
      }),
    ]);

    await waitFor(() => expect(result.current.availability.status).toBe('known'));
    expect(result.current.availability).toEqual({ status: 'known', availability: 'DEMO' });
    expect(isDuplicateAllowed(result.current.availability)).toBe(false);
    expect(result.current.exercise.data?.exerciseById.name).toBe('Mostek');
  });

  it.each([
    ['nieznane pole (błąd z path)', 'unknownField'],
    ['nieznany argument (błąd bez path)', 'unknownArg'],
  ] as const)(
    'prawdziwa odpowiedź HotChocolate backendu bez pola: %s: Duplikuj działa, a ekran ładuje się jak na main',
    async (_name, recorded) => {
      const { errors } = JSON.parse(HOTCHOCOLATE_RESPONSES[recorded].body) as {
        errors: Array<{ message: string; path?: string[]; extensions?: Record<string, unknown> }>;
      };
      const { result } = renderScreen([
        exerciseQuery,
        availabilityMock({
          result: {
            errors: errors.map(({ message, path, extensions }) => new GraphQLError(message, { path, extensions })),
          },
        }),
      ]);

      await waitFor(() => expect(result.current.exercise.data?.exerciseById.name).toBe('Mostek'));
      await waitFor(() => expect(result.current.availability.status).toBe('unsupported'));
      expect(isDuplicateAllowed(result.current.availability)).toBe(true);
      expect(result.current.exercise.error).toBeUndefined();
    }
  );

  it('dopóki zapytanie trwa, Duplikuj jest niedostępne', async () => {
    const { result } = renderScreen([
      exerciseQuery,
      availabilityMock({
        result: { data: { exerciseById: { __typename: 'Exercise', id: 'ex-1', availability: 'STANDARD' } } },
        delay: 50,
      }),
    ]);

    expect(result.current.availability.status).toBe('loading');
    expect(isDuplicateAllowed(result.current.availability)).toBe(false);

    await waitFor(() => expect(result.current.availability.status).toBe('known'));
    expect(isDuplicateAllowed(result.current.availability)).toBe(true);
  });

  it('błąd sieci (brak odpowiedzi): Duplikuj niedostępne, bo dostępność jest nieznana', async () => {
    const { result } = renderScreen([exerciseQuery, availabilityMock({ error: new TypeError('Failed to fetch') })]);

    await waitFor(() => expect(result.current.availability.status).toBe('error'));
    expect(isDuplicateAllowed(result.current.availability)).toBe(false);
    expect(result.current.exercise.error).toBeUndefined();
  });

  it('HTTP 503 to nie brak pola w schemacie: Duplikuj niedostępne', async () => {
    const { result } = renderScreen([
      exerciseQuery,
      availabilityMock({
        error: new ServerError('Response not successful: Received status code 503', {
          response: new Response('{}', { status: 503 }),
          bodyText: '{}',
        }),
      }),
    ]);

    await waitFor(() => expect(result.current.availability.status).toBe('error'));
    expect(isDuplicateAllowed(result.current.availability)).toBe(false);
  });

  it('bez id nie pyta API', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <MockedProvider mocks={[]}>{children}</MockedProvider>;
    const { result } = renderHook(() => useExerciseAvailability(null), { wrapper });

    expect(result.current.status).toBe('unsupported');
  });
});
