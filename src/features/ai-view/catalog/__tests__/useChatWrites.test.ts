import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCreatePatient, useSendPlan } from '../useChatWrites';

const { createSetMock } = vi.hoisted(() => ({ createSetMock: vi.fn() }));

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [createSetMock, { loading: false }],
  useApolloClient: () => ({ query: vi.fn(async () => ({})), refetchQueries: vi.fn(async () => []) }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const DRAFT = {
  name: 'Kolano',
  items: [
    {
      exerciseId: 'e1',
      sets: 3,
      reps: 10,
      duration: 0,
      executionTime: 3,
      restSets: 60,
      restReps: 0,
      preparationTime: 0,
    },
  ],
};

describe('useSendPlan', () => {
  it('ignores a second click while the first send is in flight', async () => {
    let release: () => void = () => undefined;
    createSetMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () =>
            resolve({ data: { createExerciseSet: { id: 'set-1' }, assignExerciseSetToPatient: { id: 'a-1' } } });
        })
    );
    const { result } = renderHook(() => useSendPlan());
    const plan = { start: 'today' as const, weeks: 2, rhythm: 'daily' as const };

    let first: Promise<unknown> = Promise.resolve();
    let second: Promise<unknown> = Promise.resolve();
    act(() => {
      first = result.current.send('org-1', 'p1', DRAFT, plan);
      second = result.current.send('org-1', 'p1', DRAFT, plan);
    });
    await expect(second).resolves.toBeNull();
    createSetMock.mockResolvedValue({ data: { assignExerciseSetToPatient: { id: 'a-1' } } });
    await act(async () => {
      release();
      await first;
    });
    const createPlanCalls = createSetMock.mock.calls.filter(([options]) => options?.variables?.kind === 'PATIENT_PLAN');
    expect(createPlanCalls).toHaveLength(1);
  });
});

describe('useCreatePatient', () => {
  it('creates one patient when the form is submitted twice in flight', async () => {
    createSetMock.mockReset();
    let release: () => void = () => undefined;
    createSetMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: { createShadowPatient: { id: 'p-new', fullname: 'Anna Nowak' } } });
        })
    );
    const { result } = renderHook(() => useCreatePatient());
    const input = { firstName: 'Anna', lastName: 'Nowak', phone: '600100200', sendActivationSms: false };

    let first: Promise<unknown> = Promise.resolve();
    let second: Promise<unknown> = Promise.resolve();
    act(() => {
      first = result.current.create('org-1', input);
      second = result.current.create('org-1', input);
    });
    await expect(second).resolves.toBeNull();
    await act(async () => {
      release();
      await first;
    });
    await expect(first).resolves.toEqual({ id: 'p-new', name: 'Anna Nowak' });
    expect(createSetMock).toHaveBeenCalledTimes(1);
  });

  it('reports the patient as added when only refreshing the lists fails afterwards', async () => {
    createSetMock.mockReset();
    // Apollo rejects the mutation itself when it awaits refetchQueries and one of them fails.
    createSetMock.mockImplementation(async (options?: { awaitRefetchQueries?: boolean }) => {
      if (options?.awaitRefetchQueries) throw new Error('refetch failed');
      return { data: { createShadowPatient: { id: 'p-new', fullname: 'Anna Nowak' } } };
    });
    const { result } = renderHook(() => useCreatePatient());

    let created: unknown;
    await act(async () => {
      created = await result.current.create('org-1', {
        firstName: 'Anna',
        lastName: 'Nowak',
        sendActivationSms: false,
      });
    });

    expect(created).toEqual({ id: 'p-new', name: 'Anna Nowak' });
  });
});
