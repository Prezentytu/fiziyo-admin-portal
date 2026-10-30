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

  it('answers a rules question in the context of the command that raised it', async () => {
    const context: IntentContext = {
      patients: [
        { id: 'p-ewa-w', name: 'Ewa Wiśniewska' },
        { id: 'p-ewa-n', name: 'Ewa Nowicka' },
      ],
      sets: [{ id: 's-knee', name: 'Kolano · faza 2', description: '' }],
    };
    const { result } = renderHook(() => useChatThread({ useAi: false, context, ready: true, scopeKey: 'org-a' }));

    await act(() => result.current.send('zestaw dla Ewy na kolano'));
    expect(result.current.messages.at(-1)).toMatchObject({ spec: { component: 'Clarify' } });

    await act(() => result.current.send('Ewa Nowicka'));
    expect(result.current.messages.at(-1)).toMatchObject({
      spec: { component: 'SetDraft', patientId: 'p-ewa-n', setId: 's-knee' },
    });
  });

  it('finishes the command behind an AI question when the next dispatch falls back to rules', async () => {
    const context: IntentContext = {
      patients: [
        { id: 'p-ewa-w', name: 'Ewa Wiśniewska' },
        { id: 'p-ewa-n', name: 'Ewa Nowicka' },
      ],
      sets: [{ id: 's-knee', name: 'Kolano · faza 2', description: '' }],
    };
    dispatchMock.mockResolvedValueOnce({
      sessionId: 'session-a',
      spec: { component: 'Clarify', question: 'O kogo chodzi?', options: ['Ewa Wiśniewska', 'Ewa Nowicka'] },
      creditsUsed: 0,
    });
    dispatchMock.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useChatThread({ useAi: true, context, ready: true, scopeKey: 'org-a' }));

    await act(() => result.current.send('zestaw dla Ewy na kolano'));
    await act(() => result.current.send('Ewa Nowicka'));

    expect(result.current.messages.at(-1)).toMatchObject({
      source: 'rules',
      spec: { component: 'SetDraft', patientId: 'p-ewa-n', setId: 's-knee' },
    });
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

  it('drops a reply that arrives after the organization changed', async () => {
    let resolveDispatch: (value: unknown) => void = () => undefined;
    dispatchMock.mockReturnValueOnce(new Promise((resolve) => (resolveDispatch = resolve)));
    const { result, rerender } = renderHook(
      ({ scopeKey }) => useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey }),
      { initialProps: { scopeKey: 'org-a' } }
    );

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.send('zestaw dla Kowalskiego');
    });
    rerender({ scopeKey: 'org-b' });
    await act(async () => {
      resolveDispatch({ sessionId: 'session-a', spec: { component: 'Navigate', route: 'patients' }, creditsUsed: 1 });
      await pending;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isBusy).toBe(false);
    await act(() => result.current.send('kto nie ćwiczy'));
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined);
  });

  it('drops a reply that arrives after a new conversation was started', async () => {
    let resolveDispatch: (value: unknown) => void = () => undefined;
    dispatchMock.mockReturnValueOnce(new Promise((resolve) => (resolveDispatch = resolve)));
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.send('zestaw dla Kowalskiego');
    });
    act(() => result.current.reset());
    await act(async () => {
      resolveDispatch({ sessionId: 'session-a', spec: { component: 'Navigate', route: 'patients' }, creditsUsed: 1 });
      await pending;
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isBusy).toBe(false);
    await act(() => result.current.send('kto nie ćwiczy'));
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined);
  });
});
