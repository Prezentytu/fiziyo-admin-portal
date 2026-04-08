import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mapPremiumAccessActionToGraphQL, usePatientPremium } from './usePatientPremium';

const { activateMutationMock, useMutationMock } = vi.hoisted(() => ({
  activateMutationMock: vi.fn(),
  useMutationMock: vi.fn(),
}));

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
    expect(activateMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          patientId: 'patient-2',
          organizationId: 'org-1',
          action: 'EXTEND_BY_DURATION',
          durationDays: 60,
          targetExpiry: null,
          reason: null,
        },
      })
    );
    expect(result.current.showConfirmDialog).toBe(false);
    expect(result.current.activationTarget).toBeNull();
  });

  it('wysyła poprawny payload dla ustawienia dokładnej daty wygaśnięcia', async () => {
    const { result } = renderHook(() => usePatientPremium({ organizationId: 'org-1' }));
    const targetExpiry = '2026-12-20T00:00:00.000Z';

    act(() => {
      result.current.initiateActivation('patient-3', 'Maria Nowak');
    });

    await act(async () => {
      await result.current.confirmActivation({
        action: 'SetExactExpiry',
        targetExpiry,
        reason: 'Korekta dostępu po zmianie planu',
      });
    });

    expect(activateMutationMock).toHaveBeenCalledTimes(1);
    expect(activateMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          patientId: 'patient-3',
          organizationId: 'org-1',
          action: 'SET_EXACT_EXPIRY',
          durationDays: null,
          targetExpiry,
          reason: 'Korekta dostępu po zmianie planu',
        },
      })
    );
  });

  it('wysyła poprawny payload dla cofnięcia dostępu premium', async () => {
    const { result } = renderHook(() => usePatientPremium({ organizationId: 'org-1' }));

    act(() => {
      result.current.initiateActivation('patient-4', 'Piotr Kowalski');
    });

    await act(async () => {
      await result.current.confirmActivation({
        action: 'RevokeNow',
        reason: 'Zwrot płatności',
      });
    });

    expect(activateMutationMock).toHaveBeenCalledTimes(1);
    expect(activateMutationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          patientId: 'patient-4',
          organizationId: 'org-1',
          action: 'REVOKE_NOW',
          durationDays: null,
          targetExpiry: null,
          reason: 'Zwrot płatności',
        },
      })
    );
  });
});

describe('mapPremiumAccessActionToGraphQL', () => {
  it.each([
    ['ExtendByDuration', 'EXTEND_BY_DURATION'],
    ['SetExactExpiry', 'SET_EXACT_EXPIRY'],
    ['RevokeNow', 'REVOKE_NOW'],
  ] as const)('mapuje %s -> %s', (inputAction, expectedGraphqlAction) => {
    expect(mapPremiumAccessActionToGraphQL(inputAction)).toBe(expectedGraphqlAction);
  });
});

