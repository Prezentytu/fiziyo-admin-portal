import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GET_EXERCISE_PICKER_DETAILS_QUERY,
  GET_EXERCISE_PICKER_RECORD_QUERY,
  GET_VISIBLE_EXERCISE_PICKER_RECORDS_QUERY,
} from '@/graphql/queries/exercises.queries';

import { useExercisePickerLibrary } from './useExercisePickerLibrary';

type Item = { id: string; name: string; updatedAt?: string };

const mockClientQuery = vi.fn();
let itemsBySearch: Record<string, Item[]> = {};
const pageCache = new Map<string, unknown>();

function pageResponse(variables: { search: string | null; page: number }) {
  const key = JSON.stringify(variables) + JSON.stringify(itemsBySearch[variables.search ?? ''] ?? []);
  if (!pageCache.has(key)) {
    const items = itemsBySearch[variables.search ?? ''] ?? [];
    pageCache.set(key, {
      availableExercisesPage: {
        items,
        totalCount: items.length,
        page: variables.page,
        hasNextPage: false,
        counts: { all: items.length, organization: 0, fiziyo: items.length },
      },
    });
  }
  return pageCache.get(key);
}

/** What the library's visibility rule returns for the asked ids (availableExercises narrowed to ids). */
let visibleRecords: Item[] = [];
const visibleRequests: Array<{ organizationId: string; ids: string[] }> = [];
const visibleCache = new Map<string, unknown>();

function visibleResponse(variables: { organizationId: string; ids: string[] }) {
  const key = JSON.stringify(variables) + JSON.stringify(visibleRecords);
  if (!visibleCache.has(key)) {
    visibleRequests.push(variables);
    const asked = visibleRecords.filter((record) => variables.ids.includes(record.id));
    visibleCache.set(key, { firstWindow: asked.slice(0, 1), secondWindow: asked.slice(1) });
  }
  return visibleCache.get(key);
}

vi.mock('@apollo/client/react', () => ({
  useQuery: (
    query: unknown,
    options: {
      variables: { search: string | null; page: number } & { organizationId: string; ids: string[] };
      skip?: boolean;
    }
  ) => {
    if (options.skip) return { data: undefined, loading: false, error: undefined };
    const data =
      query === GET_VISIBLE_EXERCISE_PICKER_RECORDS_QUERY ? visibleResponse(options.variables) : pageResponse(options.variables);
    return { data, loading: false, error: undefined };
  },
  useApolloClient: () => ({ query: mockClientQuery }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

vi.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: (value: string) => value }));

const steps = { $schema: 'fiziyo-exercise-v3', patient: { steps: ['Krok'] } };

function details(id: string, updatedAt = 't1', enrichmentData: unknown = steps) {
  return { data: { exerciseById: { id, name: id.toUpperCase(), updatedAt, enrichmentData } } };
}

describe('useExercisePickerLibrary', () => {
  beforeEach(() => {
    mockClientQuery.mockReset();
    pageCache.clear();
    visibleCache.clear();
    visibleRequests.length = 0;
    visibleRecords = [];
    itemsBySearch = {
      '': [
        { id: 'a', name: 'A', updatedAt: 't1' },
        { id: 'b', name: 'B', updatedAt: 't1' },
      ],
    };
  });

  it('loads enrichment only for chosen exercises and is ready once it arrives', async () => {
    mockClientQuery.mockResolvedValue(details('a'));

    const { result } = renderHook(() => useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: ['a'] }));

    expect(result.current.detailsPending).toBe(true);
    await waitFor(() => expect(result.current.detailsReady).toBe(true));
    expect(mockClientQuery).toHaveBeenCalledTimes(1);
    expect(mockClientQuery.mock.calls[0][0].query).toBe(GET_EXERCISE_PICKER_DETAILS_QUERY);
    expect(result.current.exercises.find((exercise) => exercise.id === 'a')).toHaveProperty('enrichmentData', steps);
    expect(result.current.exercises.find((exercise) => exercise.id === 'b')).not.toHaveProperty('enrichmentData');
    expect(result.current.library.itemIds).toEqual(['a', 'b']);
  });

  it('loads a chosen exercise that is on no loaded page by id, so a large library never drops it', async () => {
    mockClientQuery.mockResolvedValue(details('far-away'));

    const { result } = renderHook(() =>
      useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: ['far-away'] })
    );

    await waitFor(() => expect(result.current.detailsReady).toBe(true));
    expect(result.current.exercises.find((exercise) => exercise.id === 'far-away')).toMatchObject({
      name: 'FAR-AWAY',
      enrichmentData: steps,
    });
    expect(result.current.library.itemIds).not.toContain('far-away');
  });

  it('keeps an exercise chosen from a page known after the search changes', async () => {
    mockClientQuery.mockResolvedValue(details('a'));
    itemsBySearch.most = [{ id: 'm', name: 'Mostek', updatedAt: 't1' }];
    const { result } = renderHook(() => useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: ['a'] }));
    await waitFor(() => expect(result.current.detailsReady).toBe(true));

    act(() => result.current.library.onSearchChange('most'));

    expect(result.current.library.itemIds).toEqual(['m']);
    expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(expect.arrayContaining(['a', 'm']));
    expect(result.current.detailsReady).toBe(true);
  });

  it('needs no request for an exercise on a page whose enrichment is already known', () => {
    const { result } = renderHook(() =>
      useExercisePickerLibrary({
        organizationId: 'org',
        detailExerciseIds: ['a'],
        knownEnrichment: [{ id: 'a', enrichmentData: null }],
      })
    );

    expect(result.current.detailsReady).toBe(true);
    expect(mockClientQuery).not.toHaveBeenCalled();
  });

  it('fetches again when the exercise was edited after its enrichment was loaded', async () => {
    mockClientQuery.mockResolvedValue(details('a'));
    const { result, rerender } = renderHook(() =>
      useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: ['a'] })
    );
    await waitFor(() => expect(result.current.detailsReady).toBe(true));

    mockClientQuery.mockResolvedValue(details('a', 't2', null));
    itemsBySearch[''] = [{ id: 'a', name: 'A', updatedAt: 't2' }];
    rerender();

    expect(result.current.detailsReady).toBe(false);
    await waitFor(() => expect(result.current.detailsReady).toBe(true));
    expect(result.current.exercises.find((exercise) => exercise.id === 'a')).toHaveProperty('enrichmentData', null);
  });

  it('blocks saving after a failed load and retries on the next save attempt', async () => {
    mockClientQuery.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() => useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: ['a'] }));
    await waitFor(() => expect(result.current.detailsPending).toBe(false));
    expect(result.current.detailsReady).toBe(false);

    mockClientQuery.mockResolvedValue(details('a'));
    let saved = true;
    act(() => {
      saved = result.current.ensureDetailsReady();
    });

    expect(saved).toBe(false);
    await waitFor(() => expect(result.current.detailsReady).toBe(true));
  });

  it('offers as popular only exercises the library rule returns, never one fetched by id', async () => {
    // exerciseById answers for any global record, also one the library hides (unpublished, org gate, demo without access).
    mockClientQuery.mockImplementation(({ variables }: { variables: { id: string } }) =>
      Promise.resolve({ data: { exerciseById: { id: variables.id, name: variables.id, updatedAt: 't1' } } })
    );
    visibleRecords = [{ id: 'popular', name: 'Popular', updatedAt: 't1' }];

    const { result } = renderHook(() =>
      useExercisePickerLibrary({
        organizationId: 'org',
        detailExerciseIds: [],
        popularity: { hidden: 9, b: 5, popular: 3, unused: 0 },
      })
    );

    expect(visibleRequests).toEqual([{ organizationId: 'org', ids: ['hidden', 'b', 'popular'] }]);
    expect(result.current.library.popularIds).toEqual(['b', 'popular']);
    expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(['a', 'b', 'popular']);
    expect(mockClientQuery).not.toHaveBeenCalled();
    await act(async () => {});
    expect(result.current.library.popularIds).not.toContain('hidden');
    expect(result.current.exercises.map((exercise) => exercise.id)).not.toContain('hidden');
  });

  it('does not offer as popular a hidden exercise that is known because it is already in the set', async () => {
    mockClientQuery.mockImplementation(({ variables }: { variables: { id: string } }) =>
      Promise.resolve({ data: { exerciseById: { id: variables.id, name: variables.id, updatedAt: 't1', enrichmentData: null } } })
    );

    const { result } = renderHook(() =>
      useExercisePickerLibrary({
        organizationId: 'org',
        detailExerciseIds: ['hidden-chosen'],
        recordExerciseIds: ['hidden-in-set'],
        popularity: { 'hidden-chosen': 9, 'hidden-in-set': 8 },
      })
    );

    // Both stay known, so the set still opens and saves; neither is offered for adding.
    await waitFor(() =>
      expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(
        expect.arrayContaining(['hidden-chosen', 'hidden-in-set'])
      )
    );
    expect(result.current.detailsReady).toBe(true);
    expect(result.current.library.popularIds).toEqual([]);
    expect(result.current.library.itemIds).toEqual(['a', 'b']);
  });

  it('fills the popular list with the next most used exercises when the top ones are hidden', () => {
    const popularity = Object.fromEntries(Array.from({ length: 14 }, (_, index) => [`p${String(index).padStart(2, '0')}`, 100 - index]));
    visibleRecords = Object.keys(popularity)
      .filter((id) => id !== 'p00' && id !== 'p01')
      .map((id) => ({ id, name: id, updatedAt: 't1' }));

    const { result } = renderHook(() =>
      useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: [], popularity })
    );

    expect(result.current.library.popularIds).toEqual(['p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10', 'p11']);
  });

  it('loads exercises already in the set by id as records, without blocking saving', async () => {
    mockClientQuery.mockImplementation(({ variables }: { variables: { id: string } }) =>
      Promise.resolve({ data: { exerciseById: { id: variables.id, name: variables.id, updatedAt: 't1' } } })
    );

    const { result } = renderHook(() =>
      useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: [], recordExerciseIds: ['in-set'] })
    );

    await waitFor(() => expect(result.current.exercises.map((exercise) => exercise.id)).toContain('in-set'));
    expect(mockClientQuery.mock.calls.map((call) => call[0].query)).toEqual([GET_EXERCISE_PICKER_RECORD_QUERY]);
    expect(result.current.detailsReady).toBe(true);
  });

  it('loadExercise returns a just created exercise and keeps it known', async () => {
    mockClientQuery.mockResolvedValue(details('new'));
    const { result } = renderHook(() => useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: [] }));

    let record: unknown = null;
    await act(async () => {
      record = await result.current.loadExercise('new');
    });

    expect(record).toMatchObject({ id: 'new', name: 'NEW' });
    expect(record).not.toHaveProperty('enrichmentData');
    expect(result.current.exercises.find((exercise) => exercise.id === 'new')).toHaveProperty('enrichmentData', steps);
  });
});
