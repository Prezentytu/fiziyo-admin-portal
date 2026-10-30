import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ON_EXERCISE_CREATED, ON_EXERCISE_UPDATED } from '@/graphql/subscriptions';

import { useRealtimeExercises } from './useRealtimeExercises';

type OnData = (arg: { data: { data?: Record<string, string> } }) => void;

const { refetchQueriesMock, handlers } = vi.hoisted(() => ({
  refetchQueriesMock: vi.fn(),
  handlers: new Map<unknown, OnData>(),
}));

vi.mock('@apollo/client/react', () => ({
  useApolloClient: () => ({ refetchQueries: refetchQueriesMock, cache: { evict: vi.fn(), identify: vi.fn(), gc: vi.fn() } }),
  useSubscription: (document: unknown, options: { onData: OnData }) => {
    handlers.set(document, options.onData);
  },
}));

describe('useRealtimeExercises', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refetchQueriesMock.mockReset();
    handlers.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('odświeża listę raz na serię eventów, a callback woła przy każdym', () => {
    const onUpdated = vi.fn();
    renderHook(() => useRealtimeExercises({ organizationId: 'org-1', onUpdated }));

    handlers.get(ON_EXERCISE_CREATED)?.({ data: { data: { onExerciseCreated: 'a' } } });
    handlers.get(ON_EXERCISE_UPDATED)?.({ data: { data: { onExerciseUpdated: 'b' } } });
    handlers.get(ON_EXERCISE_UPDATED)?.({ data: { data: { onExerciseUpdated: 'c' } } });

    expect(onUpdated).toHaveBeenCalledTimes(2);
    expect(refetchQueriesMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(refetchQueriesMock).toHaveBeenCalledTimes(1);
  });

  it('nie odświeża po odmontowaniu', () => {
    const { unmount } = renderHook(() => useRealtimeExercises({ organizationId: 'org-1' }));
    handlers.get(ON_EXERCISE_UPDATED)?.({ data: { data: { onExerciseUpdated: 'b' } } });
    unmount();
    vi.advanceTimersByTime(1000);
    expect(refetchQueriesMock).not.toHaveBeenCalled();
  });
});
