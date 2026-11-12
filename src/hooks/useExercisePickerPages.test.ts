import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useExercisePickerPages } from './useExercisePickerPages';

type Variables = { tab: string; search: string | null; page: number; pageSize: number };

const requested: Variables[] = [];
const responses = new Map<string, unknown>();

function respond(variables: Variables) {
  const key = JSON.stringify(variables);
  if (!responses.has(key)) {
    const prefix = `${variables.tab}-${variables.search ?? ''}-p${variables.page}`;
    responses.set(key, {
      availableExercisesPage: {
        items: [{ id: `${prefix}-1` }, { id: `${prefix}-2` }],
        totalCount: 5,
        page: variables.page,
        hasNextPage: variables.page < 3,
        counts: { all: 5, organization: 2, fiziyo: 3 },
      },
    });
  }
  return responses.get(key);
}

vi.mock('@apollo/client/react', () => ({
  useQuery: (_query: unknown, options: { variables: Variables }) => {
    requested.push(options.variables);
    return { data: respond(options.variables), loading: false, error: undefined };
  },
  useApolloClient: () => ({ query: vi.fn() }),
}));

describe('useExercisePickerPages', () => {
  beforeEach(() => {
    requested.length = 0;
    responses.clear();
  });

  it('asks the API for one page of the search and tab and appends the next page on "show more"', () => {
    const { result } = renderHook(() =>
      useExercisePickerPages<{ id: string }>({ organizationId: 'org', search: '', sourceFilter: 'fiziyo' })
    );

    expect(requested[0]).toMatchObject({ tab: 'FIZIYO', search: null, page: 1 });
    expect(result.current.items.map((item) => item.id)).toEqual(['FIZIYO--p1-1', 'FIZIYO--p1-2']);
    expect(result.current.remaining).toBe(3);
    expect(result.current.counts).toEqual({ all: 5, organization: 2, fiziyo: 3 });

    act(() => result.current.loadMore());

    expect(result.current.items.map((item) => item.id)).toEqual([
      'FIZIYO--p1-1',
      'FIZIYO--p1-2',
      'FIZIYO--p2-1',
      'FIZIYO--p2-2',
    ]);
    expect(result.current.remaining).toBe(1);
  });

  it('starts again from page 1 when the search changes', () => {
    const { result, rerender } = renderHook(
      ({ search }) => useExercisePickerPages<{ id: string }>({ organizationId: 'org', search, sourceFilter: 'all' }),
      { initialProps: { search: '' } }
    );
    act(() => result.current.loadMore());

    rerender({ search: 'kolano' });

    expect(requested.at(-1)).toMatchObject({ tab: 'ALL', search: 'kolano', page: 1 });
    expect(result.current.items.map((item) => item.id)).toEqual(['ALL-kolano-p1-1', 'ALL-kolano-p1-2']);
  });
});
