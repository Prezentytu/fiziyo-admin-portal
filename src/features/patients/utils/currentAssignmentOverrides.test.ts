import { describe, expect, it, vi } from 'vitest';

import { GET_ASSIGNMENT_EXERCISE_OVERRIDES_QUERY } from '@/graphql/queries/patientAssignments.queries';

import { fetchCurrentAssignmentOverrides } from './currentAssignmentOverrides';

function clientReturning(data: unknown) {
  const query = vi.fn(async () => ({ data }));
  return { query } as unknown as Parameters<typeof fetchCurrentAssignmentOverrides>[0] & { query: typeof query };
}

describe('fetchCurrentAssignmentOverrides', () => {
  it('czyta dokument z backendu z pominięciem cache', async () => {
    const client = clientReturning({ patientAssignmentById: { id: 'a-1', exerciseOverrides: '{"m-1":{"sets":4}}' } });

    await expect(fetchCurrentAssignmentOverrides(client, 'a-1')).resolves.toBe('{"m-1":{"sets":4}}');
    expect(client.query).toHaveBeenCalledWith({
      query: GET_ASSIGNMENT_EXERCISE_OVERRIDES_QUERY,
      variables: { id: 'a-1' },
      fetchPolicy: 'no-cache',
    });
  });

  it('przypisanie bez nadpisań daje null', async () => {
    const client = clientReturning({ patientAssignmentById: { id: 'a-1', exerciseOverrides: null } });

    await expect(fetchCurrentAssignmentOverrides(client, 'a-1')).resolves.toBeNull();
  });

  it('brak przypisania to błąd, nie pusty dokument, który skasowałby personalizację', async () => {
    await expect(fetchCurrentAssignmentOverrides(clientReturning({ patientAssignmentById: null }), 'a-1')).rejects.toThrow();
    await expect(fetchCurrentAssignmentOverrides(clientReturning(undefined), 'a-1')).rejects.toThrow();
  });
});
