import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChatThread } from '../useChatThread';
import type { IntentContext } from '../utils/intentRouter';

const { dispatchMock } = vi.hoisted(() => ({ dispatchMock: vi.fn() }));

vi.mock('../chatDispatchClient', () => ({
  dispatchChatMessage: (...args: unknown[]) => dispatchMock(...args),
}));

const CONTEXT: IntentContext = { patients: [{ id: 'p1', name: 'Jan Kowalski' }], sets: [] };

describe('useChatThread', () => {
  beforeEach(() => {
    dispatchMock.mockReset();
    dispatchMock.mockResolvedValue({
      sessionId: 'session-a',
      spec: { component: 'Navigate', route: 'patients' },
      creditsUsed: 1,
    });
  });

  it('does not answer while chat data is loading', async () => {
    const { result } = renderHook(() =>
      useChatThread({ useAi: false, context: { patients: [], sets: [] }, ready: false, scopeKey: 'org-a' })
    );

    await act(() => result.current.send('Utwórz zestaw'));

    expect(result.current.messages).toEqual([]);
  });

  it('starts a new conversation and AI session when the organization changes', async () => {
    const { result, rerender } = renderHook(
      ({ scopeKey }) => useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey }),
      { initialProps: { scopeKey: 'org-a' } }
    );

    await act(() => result.current.send('zestaw dla Kowalskiego'));
    expect(result.current.messages).toHaveLength(2);

    rerender({ scopeKey: 'org-b' });
    expect(result.current.messages).toEqual([]);

    await act(() => result.current.send('kto nie ćwiczy'));
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined);
  });
});
