import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/tokenCache', () => ({ getBackendToken: () => 'token' }));
vi.mock('@/lib/aiCreditsRefresh', () => ({ triggerCreditsRefresh: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { aiService } from '../aiService';

function respond(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status }))
  );
}

describe('aiService.suggestExercise', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-11-12T10:00:00Z'), toFake: ['Date'] }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('przy wyczerpanej puli zwraca powód insufficient_credits zamiast pustego null', async () => {
    respond(400, { error: 'insufficient_credits', remaining: 0, required: 1 });

    const result = await aiService.suggestExercise('Przysiad', [], []);

    expect(result).toMatchObject({ status: 'error', failure: { kind: 'insufficient_credits' } });
  });

  it('przy odmowie roli zwraca powód forbidden', async () => {
    respond(403, { error: 'forbidden' });

    const result = await aiService.suggestExercise('Wykrok', [], []);

    expect(result).toMatchObject({ status: 'error', failure: { kind: 'forbidden' } });
  });

  it('nieznany błąd zostawia failure null, żeby panel zaproponował ponowienie', async () => {
    respond(500, { error: 'boom' });

    const result = await aiService.suggestExercise('Most', [], []);

    expect(result).toEqual({ status: 'error', failure: null });
  });
});
