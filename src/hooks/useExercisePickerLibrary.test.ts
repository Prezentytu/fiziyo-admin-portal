import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GET_EXERCISE_PICKER_DETAILS_QUERY,
  GET_EXERCISE_PICKER_RECORD_QUERY,
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

vi.mock('@apollo/client/react', () => ({
  useQuery: (_query: unknown, options: { variables: { search: string | null; page: number }; skip?: boolean }) => ({
    data: options.skip ? undefined : pageResponse(options.variables),
    loading: false,
    error: undefined,
  }),
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

  it('loads popular and shown exercises outside the pages as records, without blocking saving', async () => {
    mockClientQuery.mockImplementation(({ variables }: { variables: { id: string } }) =>
      Promise.resolve({ data: { exerciseById: { id: variables.id, name: variables.id, updatedAt: 't1' } } })
    );

    const { result } = renderHook(() =>
      useExercisePickerLibrary({
        organizationId: 'org',
        detailExerciseIds: [],
        recordExerciseIds: ['in-set'],
        popularity: { b: 9, popular: 3, unused: 0 },
      })
    );

    expect(result.current.library.popularIds).toEqual(['b', 'popular']);
    await waitFor(() =>
      expect(result.current.exercises.map((exercise) => exercise.id)).toEqual(expect.arrayContaining(['in-set', 'popular']))
    );
    expect(mockClientQuery.mock.calls.map((call) => call[0].query)).toEqual([
      GET_EXERCISE_PICKER_RECORD_QUERY,
      GET_EXERCISE_PICKER_RECORD_QUERY,
    ]);
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
