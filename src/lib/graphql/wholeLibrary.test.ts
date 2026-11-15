import { describe, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';

import { fetchWholeLibrary } from './wholeLibrary';

const QUERY = gql`
  query Names($organizationId: String!, $skip: Int!, $take: Int!) {
    availableExercises(organizationId: $organizationId, skip: $skip, take: $take) {
      id
    }
  }
`;

const library = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `ex-${index}` }));

function client(items: { id: string }[]) {
  const query = vi.fn(async ({ variables }: { variables: { skip: number; take: number } }) => ({
    data: { availableExercises: items.slice(variables.skip, variables.skip + variables.take) },
  }));
  return { query } as unknown as Parameters<typeof fetchWholeLibrary>[0] & { query: typeof query };
}

describe('fetchWholeLibrary', () => {
  it('reads past one page, so the exercise at the end of the alphabet is there', async () => {
    const items = library(7);
    const api = client(items);

    const all = await fetchWholeLibrary(api, QUERY, 'org-1', 'cache-first', 3);

    expect(all.map((item) => item.id)).toEqual(items.map((item) => item.id));
    expect(api.query.mock.calls.map(([options]) => options.variables)).toEqual([
      { organizationId: 'org-1', skip: 0, take: 3 },
      { organizationId: 'org-1', skip: 3, take: 3 },
      { organizationId: 'org-1', skip: 6, take: 3 },
    ]);
  });

  it('stops on an empty page when the library splits evenly', async () => {
    const api = client(library(6));

    const all = await fetchWholeLibrary(api, QUERY, 'org-1', 'network-only', 3);

    expect(all).toHaveLength(6);
    expect(api.query).toHaveBeenCalledTimes(3);
    expect(api.query.mock.calls[0][0]).toMatchObject({ fetchPolicy: 'network-only' });
  });

  it('keeps one copy of a record that shifted to the next page', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ data: { availableExercises: library(3) } })
      .mockResolvedValueOnce({ data: { availableExercises: [{ id: 'ex-2' }, { id: 'ex-3' }] } });

    const all = await fetchWholeLibrary({ query } as never, QUERY, 'org-1', 'cache-first', 3);

    expect(all.map((item) => item.id)).toEqual(['ex-0', 'ex-1', 'ex-2', 'ex-3']);
  });
});
