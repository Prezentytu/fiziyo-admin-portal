import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STOPPED_TEXT, useChatThread } from '../useChatThread';
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

    await act(() => result.current.send('nie wiem'));
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

  it('sends one message when the composer fires twice before the busy state renders', async () => {
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    await act(() => Promise.all([result.current.send('Pokaż pacjentów'), result.current.send('Pokaż pacjentów')]));

    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(result.current.messages.filter((message) => message.role === 'user')).toHaveLength(1);
  });

  it('runs one task when a file is picked twice and reports whether it succeeded', async () => {
    const task = vi.fn().mockResolvedValue({ text: 'Gotowe.' });
    const { result } = renderHook(() =>
      useChatThread({ useAi: false, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    let outcomes: boolean[] = [];
    await act(async () => {
      outcomes = await Promise.all([
        result.current.runTask('Dokument', task),
        result.current.runTask('Dokument', task),
      ]);
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual([true, false]);

    let failed = true;
    await act(async () => {
      failed = await result.current.runTask('Dokument', () => Promise.reject(new Error('Za duży.')));
    });
    expect(failed).toBe(false);
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
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined, expect.any(AbortSignal));
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
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined, expect.any(AbortSignal));
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
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined, expect.any(AbortSignal));
  });

  it('stops a reply in flight: the request is aborted, the question stays and the next turn starts a new AI session', async () => {
    let resolveDispatch: (value: unknown) => void = () => undefined;
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );
    await act(() => result.current.send('kto nie ćwiczy'));
    dispatchMock.mockReturnValueOnce(new Promise((resolve) => (resolveDispatch = resolve)));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.send('zestaw dla Kowalskiego');
    });
    const signal = dispatchMock.mock.lastCall?.[2] as AbortSignal;
    expect(dispatchMock).toHaveBeenLastCalledWith('zestaw dla Kowalskiego', 'session-a', expect.any(AbortSignal));
    act(() => result.current.stop());
    expect(signal.aborted).toBe(true);
    await act(async () => {
      resolveDispatch({ sessionId: 'session-a', spec: { component: 'Navigate', route: 'patients' }, creditsUsed: 1 });
      await pending;
    });

    expect(result.current.isBusy).toBe(false);
    expect(result.current.messages).toHaveLength(4);
    expect(result.current.messages[2]).toMatchObject({ role: 'user', text: 'zestaw dla Kowalskiego' });
    expect(result.current.messages[3]).toMatchObject({ role: 'assistant', text: STOPPED_TEXT, spec: undefined });
    await act(() => result.current.send('kto nie ćwiczy'));
    expect(dispatchMock).toHaveBeenLastCalledWith('kto nie ćwiczy', undefined, expect.any(AbortSignal));
    expect(result.current.messages).toHaveLength(6);
  });

  it('stops a document task: its request is aborted, no card lands and the next send works', async () => {
    let resolveTask: (value: { text: string }) => void = () => undefined;
    let taskSignal: AbortSignal | undefined;
    const { result } = renderHook(() =>
      useChatThread({ useAi: true, context: CONTEXT, ready: true, scopeKey: 'org-a' })
    );

    let pending: Promise<boolean> = Promise.resolve(false);
    act(() => {
      pending = result.current.runTask('Przeanalizuj dokument', (signal) => {
        taskSignal = signal;
        return new Promise((resolve) => (resolveTask = resolve));
      });
    });
    act(() => result.current.stop());
    expect(taskSignal?.aborted).toBe(true);
    let landed = true;
    await act(async () => {
      resolveTask({ text: 'Znalazłem 3 ćwiczenia.' });
      landed = await pending;
    });

    expect(landed).toBe(false);
    expect(result.current.messages.map((message) => message.text)).toEqual(['Przeanalizuj dokument', STOPPED_TEXT]);
    await act(() => result.current.send('kto nie ćwiczy'));
    expect(result.current.messages).toHaveLength(4);
  });
});
