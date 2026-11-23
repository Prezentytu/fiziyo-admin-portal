import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ signOut: vi.fn(async () => undefined) }));

vi.mock('@clerk/nextjs', () => ({ useClerk: () => ({ signOut: mocks.signOut }) }));
vi.mock('@/lib/telemetry/client', () => ({ setTelemetryUser: vi.fn() }));

import { saveBackendToken, getBackendToken } from '@/lib/tokenCache';
import { useAppSignOut } from '../useAppSignOut';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mocks.signOut.mockClear();
});

describe('useAppSignOut', () => {
  it('drops everything the next user in this tab must not see before leaving Clerk', async () => {
    saveBackendToken('a.eyJjbGVya19pZCI6InVzZXJfYSJ9.c');
    localStorage.setItem('fizyo_last_organization_id', 'org-a');
    localStorage.setItem('fizyo_exercise_builder', '[{"id":"ex-legacy"}]');
    localStorage.setItem('fizyo_exercise_builder:org-a', '[{"id":"ex-private"}]');
    localStorage.setItem('fiziyo-theme', 'dark');

    const { result } = renderHook(() => useAppSignOut());
    await act(() => result.current('/sign-in'));

    expect(getBackendToken()).toBeNull();
    expect(localStorage.getItem('fizyo_last_organization_id')).toBeNull();
    expect(localStorage.getItem('fizyo_exercise_builder')).toBeNull();
    expect(localStorage.getItem('fizyo_exercise_builder:org-a')).toBeNull();
    expect(localStorage.getItem('fiziyo-theme')).toBe('dark');
    expect(mocks.signOut).toHaveBeenCalledWith({ redirectUrl: '/sign-in' });
  });
});
