import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useApolloClient } from '@apollo/client/react';
import { MockedProvider } from '@apollo/client/testing/react';
import type { MockLink } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';

import { GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY } from '@/graphql/queries/exercises.queries';
import { EXERCISE_PICKER_PAGE_SIZE } from '@/utils/exercisePickerPages';

import { useExercisePickerPages } from './useExercisePickerPages';

// Real Apollo Client behind the hook: answers arrive late, out of order or fail, as on a slow network.

type Item = { id: string; name: string };

function exercise(id: string) {
  return {
    __typename: 'Exercise',
    id,
    name: id,
    patientDescription: null,
    clinicalDescription: null,
    audioCue: null,
    rangeOfMotion: null,
    type: null,
    sets: null,
    reps: null,
    duration: null,
    restSets: null,
    restReps: null,
    preparationTime: null,
    executionTime: null,
    side: null,
    tempo: null,
    defaultSets: null,
    defaultReps: null,
    defaultDuration: null,
    defaultExecutionTime: null,
    defaultRestBetweenSets: null,
    defaultRestBetweenReps: null,
    defaultLoad: null,
    loadType: null,
    loadValue: null,
    loadUnit: null,
    loadText: null,
    scope: 'GLOBAL',
    status: 'PUBLISHED',
    isActive: true,
    createdAt: null,
    updatedAt: null,
    difficultyLevel: null,
    mainTags: [],
    additionalTags: [],
    notes: null,
    gifUrl: null,
    images: [],
    imageUrl: null,
    thumbnailUrl: null,
    videoUrl: null,
  };
}

function pageMock(
  search: string | null,
  page: number,
  ids: string[],
  options: { delay?: number; hasNextPage?: boolean; totalCount?: number; error?: Error } = {}
): MockLink.MockedResponse {
  const request = {
    query: GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY,
    variables: { organizationId: 'org', tab: 'ALL', search, page, pageSize: EXERCISE_PICKER_PAGE_SIZE },
  };
  if (options.error) return { request, error: options.error, delay: options.delay ?? 0 };
  return {
    request,
    delay: options.delay ?? 0,
    result: {
      data: {
        availableExercisesPage: {
          __typename: 'AvailableExercisesPage',
          items: ids.map(exercise),
          totalCount: options.totalCount ?? ids.length,
          page,
          pageSize: EXERCISE_PICKER_PAGE_SIZE,
          hasNextPage: options.hasNextPage ?? false,
          counts: { __typename: 'ExerciseLibraryCounts', all: 9, organization: 4, fiziyo: 5 },
        },
      },
    },
  };
}

function renderPages(mocks: MockLink.MockedResponse[], initialSearch = '') {
  const wrapper = ({ children }: { children: ReactNode }) => <MockedProvider mocks={mocks}>{children}</MockedProvider>;
  return renderHook(
    ({ search }) => useExercisePickerPages<Item>({ organizationId: 'org', search, sourceFilter: 'all' }),
    { initialProps: { search: initialSearch }, wrapper }
  );
}

const ids = (items: readonly Item[]) => items.map((item) => item.id);
const settle = (ms: number) => act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

describe('useExercisePickerPages with Apollo Client', () => {
  it('a slow answer to an older search never replaces the answer to the newer one', async () => {
    const { result, rerender } = renderPages(
      [pageMock('ko', 1, ['ko-1', 'ko-2'], { delay: 60 }), pageMock('kol', 1, ['kol-1'], { delay: 5 })],
      'ko'
    );

    rerender({ search: 'kol' });
    await waitFor(() => expect(ids(result.current.items)).toEqual(['kol-1']));

    await settle(120);
    expect(ids(result.current.items)).toEqual(['kol-1']);
    expect(result.current.totalCount).toBe(1);
  });

  it('shows nothing from the previous search while the new one loads', async () => {
    const { result, rerender } = renderPages([
      pageMock(null, 1, ['all-1', 'all-2']),
      pageMock('most', 1, ['most-1'], { delay: 30 }),
    ]);
    await waitFor(() => expect(ids(result.current.items)).toEqual(['all-1', 'all-2']));

    rerender({ search: 'most' });

    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.counts).toEqual(expect.objectContaining({ all: 9, organization: 4, fiziyo: 5 }));
    await waitFor(() => expect(ids(result.current.items)).toEqual(['most-1']));
  });

  it('keeps the loaded pages when the next page fails and asks for it again on "show more"', async () => {
    const { result } = renderPages([
      pageMock(null, 1, ['p1-1', 'p1-2'], { hasNextPage: true, totalCount: 4 }),
      pageMock(null, 2, [], { error: new Error('network') }),
      pageMock(null, 2, ['p2-1', 'p2-2'], { totalCount: 4 }),
    ]);
    await waitFor(() => expect(ids(result.current.items)).toEqual(['p1-1', 'p1-2']));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(ids(result.current.items)).toEqual(['p1-1', 'p1-2']);
    expect(result.current.remaining).toBe(2);

    act(() => result.current.loadMore());
    await waitFor(() => expect(ids(result.current.items)).toEqual(['p1-1', 'p1-2', 'p2-1', 'p2-2']));
    expect(result.current.remaining).toBe(0);
  });

  it('refreshes the earlier pages too when the library changed after a write', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MockedProvider
        mocks={[
          pageMock(null, 1, ['p1-1', 'p1-2'], { hasNextPage: true, totalCount: 3 }),
          pageMock(null, 2, ['p2-1'], { totalCount: 3 }),
          // After a write: a new exercise leads page 1 and pushes the rest down.
          pageMock(null, 2, ['p1-2', 'p2-1'], { totalCount: 4 }),
          pageMock(null, 1, ['new', 'p1-1'], { hasNextPage: true, totalCount: 4 }),
        ]}
      >
        {children}
      </MockedProvider>
    );
    const { result } = renderHook(
      () => ({
        pages: useExercisePickerPages<Item>({ organizationId: 'org', search: '', sourceFilter: 'all' }),
        client: useApolloClient(),
      }),
      { wrapper }
    );
    await waitFor(() => expect(ids(result.current.pages.items)).toEqual(['p1-1', 'p1-2']));
    act(() => result.current.pages.loadMore());
    await waitFor(() => expect(ids(result.current.pages.items)).toEqual(['p1-1', 'p1-2', 'p2-1']));

    await act(async () => {
      await result.current.client.refetchQueries({ include: [GET_AVAILABLE_EXERCISES_PICKER_PAGE_QUERY] });
    });

    await waitFor(() => expect(ids(result.current.pages.items)).toEqual(['new', 'p1-1', 'p1-2', 'p2-1']));
    expect(result.current.pages.remaining).toBe(0);
  });
});
