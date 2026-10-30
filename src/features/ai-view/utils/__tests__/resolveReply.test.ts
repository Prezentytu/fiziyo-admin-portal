import { describe, expect, it, vi } from 'vitest';

import { ChatDispatchError, resolveReply, type Dispatcher } from '../resolveReply';

const CONTEXT = { patients: [{ id: 'p-jan', name: 'Jan Kowalski' }], sets: [] };

describe('resolveReply', () => {
  it('uses the AI dispatcher when allowed', async () => {
    const dispatch: Dispatcher = vi.fn(async () => ({
      sessionId: 's-1',
      spec: { component: 'PatientPeek' as const, filter: 'inactive' as const },
      creditsUsed: 1,
    }));
    const reply = await resolveReply('kto nie ćwiczy', { useAi: true, context: CONTEXT, dispatch });
    expect(reply).toEqual({
      spec: { component: 'PatientPeek', filter: 'inactive' },
      source: 'ai',
      sessionId: 's-1',
      creditsUsed: 1,
    });
  });

  it('falls back to rules with the failure reason', async () => {
    const dispatch: Dispatcher = async () => {
      throw new ChatDispatchError('insufficient_credits', 'brak');
    };
    const reply = await resolveReply('zestaw dla Jana Kowalskiego', { useAi: true, context: CONTEXT, dispatch });
    expect(reply).toEqual({
      spec: { component: 'PatientPeek', patientId: 'p-jan' },
      source: 'rules',
      creditsUsed: 0,
      fallbackReason: 'insufficient_credits',
    });
  });

  it('treats unexpected errors as an unavailable model', async () => {
    const dispatch: Dispatcher = async () => {
      throw new TypeError('network');
    };
    const reply = await resolveReply('kto nie ćwiczy', { useAi: true, context: CONTEXT, dispatch });
    expect(reply.fallbackReason).toBe('unavailable');
  });

  it('never calls the model when AI is off', async () => {
    const dispatch = vi.fn<Dispatcher>();
    const reply = await resolveReply('kto nie ćwiczy', { useAi: false, context: CONTEXT, dispatch });
    expect(dispatch).not.toHaveBeenCalled();
    expect(reply.source).toBe('rules');
  });
});
