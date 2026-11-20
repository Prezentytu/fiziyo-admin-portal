import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChatFirstRun } from '../useChatFirstRun';

const clerk = vi.hoisted(() => {
  const now = new Date();
  return {
    roleLoading: false,
    user: {
      id: 'user-new',
      createdAt: now,
      unsafeMetadata: {} as Record<string, unknown>,
      updateMetadata: vi.fn(),
    },
    session: { id: 'signup-session', createdAt: now, user: { id: 'user-new' } },
  };
});

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: clerk.user }),
  useSession: () => ({ session: clerk.session }),
}));

vi.mock('@/hooks/useRoleAccess', () => ({
  useRoleAccess: () => ({ role: 'owner', isLoading: clerk.roleLoading, canManageOrganization: true }),
}));

beforeEach(() => {
  localStorage.clear();
  clerk.roleLoading = false;
  clerk.user.unsafeMetadata = {};
  clerk.user.updateMetadata.mockReset().mockResolvedValue(clerk.user);
});

describe('useChatFirstRun', () => {
  it('waits until the role is known and opens the first step on the chat home', async () => {
    clerk.roleLoading = true;
    const { result, rerender } = renderHook((enabled) => useChatFirstRun(enabled), { initialProps: false });
    expect(result.current.step).toBeNull();

    rerender(true);
    expect(result.current.step).toBeNull();
    clerk.roleLoading = false;
    rerender(true);

    await waitFor(() => expect(result.current.step).toBe(0));
  });

  it('dismisses immediately and remembers the choice after remount if the account write fails', async () => {
    clerk.user.updateMetadata.mockRejectedValue(new Error('Offline'));
    const first = renderHook(() => useChatFirstRun(true));
    await waitFor(() => expect(first.result.current.step).toBe(0));
    act(() => first.result.current.goToStep(2));
    expect(first.result.current.step).toBe(2);

    act(() => first.result.current.dismiss());
    expect(first.result.current.step).toBeNull();
    expect(clerk.user.updateMetadata).toHaveBeenCalledWith({ unsafeMetadata: { portalChatTourFinished: true } });
    first.unmount();

    const second = renderHook(() => useChatFirstRun(true));
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    expect(second.result.current.step).toBeNull();
  });

  it('honors a choice saved on the account from another browser', async () => {
    clerk.user.unsafeMetadata.portalChatTourFinished = true;
    const { result } = renderHook(() => useChatFirstRun(true));
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    expect(result.current.step).toBeNull();
  });
});
