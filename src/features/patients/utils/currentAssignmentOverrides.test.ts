import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { describe, expect, it, vi } from 'vitest';

import { GET_ASSIGNMENT_EXERCISE_OVERRIDES_QUERY } from '@/graphql/queries/patientAssignments.queries';

import {
  EXERCISE_OVERRIDES_CONFLICT,
  fetchCurrentAssignmentOverrides,
  isExerciseOverridesConflictError,
  overridesVersionVariables,
} from './currentAssignmentOverrides';

function clientReturning(data: unknown) {
  const query = vi.fn(async () => ({ data }));
  return { query } as unknown as Parameters<typeof fetchCurrentAssignmentOverrides>[0] & { query: typeof query };
}

describe('fetchCurrentAssignmentOverrides', () => {
  it('czyta dokument i jego wersję z backendu z pominięciem cache', async () => {
    const client = clientReturning({
      patientAssignmentById: { id: 'a-1', exerciseOverrides: '{"m-1":{"sets":4}}', exerciseOverridesVersion: 3 },
    });

    await expect(fetchCurrentAssignmentOverrides(client, 'a-1')).resolves.toEqual({
      json: '{"m-1":{"sets":4}}',
      version: 3,
    });
    expect(client.query).toHaveBeenCalledWith({
      query: GET_ASSIGNMENT_EXERCISE_OVERRIDES_QUERY,
      variables: { id: 'a-1' },
      fetchPolicy: 'no-cache',
    });
  });

  it('przypisanie bez nadpisań daje null, wersja 0 zostaje wersją', async () => {
    const client = clientReturning({
      patientAssignmentById: { id: 'a-1', exerciseOverrides: null, exerciseOverridesVersion: 0 },
    });

    await expect(fetchCurrentAssignmentOverrides(client, 'a-1')).resolves.toEqual({ json: null, version: 0 });
  });

  it('brak przypisania to błąd, nie pusty dokument, który skasowałby personalizację', async () => {
    await expect(fetchCurrentAssignmentOverrides(clientReturning({ patientAssignmentById: null }), 'a-1')).rejects.toThrow();
    await expect(fetchCurrentAssignmentOverrides(clientReturning(undefined), 'a-1')).rejects.toThrow();
  });
});

describe('overridesVersionVariables (fizjo-app#509)', () => {
  it('wysyła wersję z odczytu, także 0', () => {
    expect(overridesVersionVariables({ json: null, version: 0 })).toEqual({ expectedExerciseOverridesVersion: 0 });
    expect(overridesVersionVariables({ json: '{}', version: 7 })).toEqual({ expectedExerciseOverridesVersion: 7 });
  });

  it('bez wersji z odczytu nie wysyła argumentu, więc zapis działa jak dotąd', () => {
    expect(overridesVersionVariables({ json: '{}', version: undefined })).toEqual({});
  });
});

describe('isExerciseOverridesConflictError', () => {
  it('rozpoznaje odmowę po kodzie błędu GraphQL', () => {
    const conflict = new CombinedGraphQLErrors({
      errors: [{ message: 'Plan pacjenta zmienił się w międzyczasie.', extensions: { code: EXERCISE_OVERRIDES_CONFLICT } }],
    });
    const other = new CombinedGraphQLErrors({ errors: [{ message: 'x', extensions: { code: 'AUTH_NOT_AUTHORIZED' } }] });

    expect(isExerciseOverridesConflictError(conflict)).toBe(true);
    expect(isExerciseOverridesConflictError(other)).toBe(false);
    expect(isExerciseOverridesConflictError(new Error(EXERCISE_OVERRIDES_CONFLICT))).toBe(false);
  });
});
