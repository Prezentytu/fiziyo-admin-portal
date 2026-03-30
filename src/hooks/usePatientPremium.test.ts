import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePatientPremium } from './usePatientPremium';

const activateMutationMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock('@apollo/client/react', () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('usePatientPremium', () => {
  beforeEach(() => {
    activateMutationMock.mockReset();
    useMutationMock.mockReset();

    useMutationMock.mockImplementation((_document: unknown, options: { onCompleted?: () => void } = {}) => {
      activateMutationMock.mockImplementation(async () => {
        options.onCompleted?.();
        return { data: {} };
      });

      return [activateMutationMock, { loading: false }];
    });
  });

  it('zawsze otwiera dialog i nie wykonuje mutacji bez potwierdzenia', () => {
    const { result } = renderHook(() => usePatientPremium({ organizationId: 'org-1' }));

    act(() => {
      result.current.initiateActivation('patient-1', 'Jan Kowalski', '2026-04-29T00:00:00.000Z');
    });

    expect(result.current.showConfirmDialog).toBe(true);
    expect(result.current.activationTarget?.patientId).toBe('patient-1');
    expect(activateMutationMock).not.toHaveBeenCalled();
  });

  it('wykonuje mutację dopiero po confirm z payloadem zarządzania premium', async () => {
    const { result } = renderHook(() => usePatientPremium({ organizationId: 'org-1' }));

    act(() => {
      result.current.initiateActivation('patient-2', 'Anna Nowak');
    });

    await act(async () => {
      await result.current.confirmActivation({
        action: 'ExtendByDuration',
        durationDays: 60,
      });
    });

    expect(activateMutationMock).toHaveBeenCalledTimes(1);
    expect(activateMutationMock).toHaveBeenCalledWith({
      variables: {
        patientId: 'patient-2',
        organizationId: 'org-1',
        action: 'ExtendByDuration',
        durationDays: 60,
        targetExpiry: null,
        reason: null,
      },
    });
    expect(result.current.showConfirmDialog).toBe(false);
    expect(result.current.activationTarget).toBeNull();
  });
});

