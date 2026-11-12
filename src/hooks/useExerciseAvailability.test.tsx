import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';

import { GET_EXERCISE_AVAILABILITY_QUERY } from '@/graphql/queries/exercises.queries';

import { useExerciseAvailability } from './useExerciseAvailability';

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

function availabilityMock(outcome: Pick<MockLink.MockedResponse, 'result' | 'error'>): MockLink.MockedResponse {
  return { request: { query: GET_EXERCISE_AVAILABILITY_QUERY, variables: { id: 'ex-1' } }, ...outcome };
}

function renderScreen(mocks: MockLink.MockedResponse[]) {
  const wrapper = ({ children }: { children: ReactNode }) => <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  return renderHook(
    () => ({
      exercise: useQuery<{ exerciseById: { id: string; name: string } }>(GET_EXERCISE_NAME_QUERY, { variables: { id: 'ex-1' } }),
      availability: useExerciseAvailability('ex-1'),
    }),
    { wrapper }
  );
}

describe('useExerciseAvailability', () => {
  it('oddaje dostępność, gdy API zna pole', async () => {
    const { result } = renderScreen([
      exerciseQuery,
      availabilityMock({ result: { data: { exerciseById: { __typename: 'Exercise', id: 'ex-1', availability: 'DEMO' } } } }),
    ]);

    await waitFor(() => expect(result.current.availability).toBe('DEMO'));
    expect(result.current.exercise.data?.exerciseById.name).toBe('Mostek');
  });

  it.each([
    [
      'odpowiedź z błędem walidacji',
      { result: { errors: [new GraphQLError('The field `availability` does not exist on the type `Exercise`.')] } },
    ],
    ['HTTP 400 bez danych', { error: new Error('Response not successful: Received status code 400') }],
  ])('API bez pola (%s): brak dostępności, a ekran ładuje się jak na main', async (_name, outcome) => {
    const { result } = renderScreen([exerciseQuery, availabilityMock(outcome)]);

    await waitFor(() => expect(result.current.exercise.data?.exerciseById.name).toBe('Mostek'));
    await waitFor(() => expect(result.current.exercise.loading).toBe(false));

    expect(result.current.availability).toBeUndefined();
    expect(result.current.exercise.error).toBeUndefined();
  });

  it('bez id nie pyta API', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <MockedProvider mocks={[]}>{children}</MockedProvider>;
    const { result } = renderHook(() => useExerciseAvailability(null), { wrapper });

    expect(result.current).toBeUndefined();
  });
});
