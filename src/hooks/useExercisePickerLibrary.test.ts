import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useExercisePickerLibrary } from './useExercisePickerLibrary';

const mockClientQuery = vi.fn();
let listItems: Array<{ id: string; name: string; updatedAt?: string }> = [];

vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: { availableExercises: listItems }, loading: false, error: undefined, refetch: vi.fn() }),
  useApolloClient: () => ({ query: mockClientQuery }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const steps = { $schema: 'fiziyo-exercise-v3', patient: { steps: ['Krok'] } };

describe('useExercisePickerLibrary', () => {
  beforeEach(() => {
    mockClientQuery.mockReset();
    listItems = [
      { id: 'a', name: 'A', updatedAt: 't1' },
      { id: 'b', name: 'B', updatedAt: 't1' },
    ];
  });

  it('loads enrichment only for chosen exercises and is ready once it arrives', async () => {
    mockClientQuery.mockResolvedValue({ data: { exerciseById: { id: 'a', updatedAt: 't1', enrichmentData: steps } } });

    const { result } = renderHook(() =>
      useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: ['a'] })
    );

    expect(result.current.detailsPending).toBe(true);
    await waitFor(() => expect(result.current.detailsReady).toBe(true));
    expect(mockClientQuery).toHaveBeenCalledTimes(1);
    expect(result.current.exercises.find((exercise) => exercise.id === 'a')).toHaveProperty('enrichmentData', steps);
    expect(result.current.exercises.find((exercise) => exercise.id === 'b')).not.toHaveProperty('enrichmentData');
  });

  it('needs no request for exercises whose enrichment is already known', () => {
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
    mockClientQuery.mockResolvedValue({ data: { exerciseById: { id: 'a', updatedAt: 't1', enrichmentData: steps } } });
    const { result, rerender } = renderHook(() =>
      useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: ['a'] })
    );
    await waitFor(() => expect(result.current.detailsReady).toBe(true));

    mockClientQuery.mockResolvedValue({ data: { exerciseById: { id: 'a', updatedAt: 't2', enrichmentData: null } } });
    listItems = [{ id: 'a', name: 'A', updatedAt: 't2' }];
    rerender();

    expect(result.current.detailsReady).toBe(false);
    await waitFor(() => expect(result.current.detailsReady).toBe(true));
    expect(result.current.exercises[0]).toHaveProperty('enrichmentData', null);
  });

  it('blocks saving after a failed load and retries on the next save attempt', async () => {
    mockClientQuery.mockRejectedValueOnce(new Error('network'));
    const { result } = renderHook(() =>
      useExercisePickerLibrary({ organizationId: 'org', detailExerciseIds: ['a'] })
    );
    await waitFor(() => expect(result.current.detailsPending).toBe(false));
    expect(result.current.detailsReady).toBe(false);

    mockClientQuery.mockResolvedValue({ data: { exerciseById: { id: 'a', updatedAt: 't1', enrichmentData: steps } } });
    let saved = true;
    act(() => {
      saved = result.current.ensureDetailsReady();
    });

    expect(saved).toBe(false);
    await waitFor(() => expect(result.current.detailsReady).toBe(true));
  });
});
