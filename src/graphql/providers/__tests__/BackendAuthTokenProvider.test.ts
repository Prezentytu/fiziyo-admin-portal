import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendAuthTokenProvider } from '../BackendAuthTokenProvider';
import { BackendTokenUnavailableError, isTransientTokenExchangeError } from '../tokenExchangeRetry';
import { tokenExchangeService, type TokenExchangeError } from '@/services/tokenExchangeService';

vi.mock('@/services/tokenExchangeService', () => ({
  tokenExchangeService: { exchangeClerkToken: vi.fn() },
}));

const exchange = vi.mocked(tokenExchangeService.exchangeClerkToken);

function jwt(payload: Record<string, unknown>): string {
  return `h.${btoa(JSON.stringify(payload))}.s`;
}

const CLERK_TOKEN = jwt({ sub: 'user_1' });
const BACKEND_TOKEN = jwt({ clerk_id: 'user_1', role: 'therapist', exp: Math.floor(Date.now() / 1000) + 3600 });

function httpError(status: number): TokenExchangeError {
  const error = new Error(`Token exchange failed: ${status}`) as TokenExchangeError;
  error.status = status;
  return error;
}

function never<T>(): Promise<T> {
  return new Promise<T>(() => undefined);
}

describe('BackendAuthTokenProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    exchange.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries an exchange aborted by navigation and caches the token', async () => {
    exchange
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockRejectedValueOnce(new DOMException('signal is aborted without reason', 'AbortError'))
      .mockResolvedValueOnce({ access_token: BACKEND_TOKEN } as never);
    const provider = new BackendAuthTokenProvider(async () => CLERK_TOKEN);

    const result = provider.getToken();
    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe(BACKEND_TOKEN);
    expect(exchange).toHaveBeenCalledTimes(3);
    expect(sessionStorage.getItem('BACKEND_JWT_TOKEN')).toBe(BACKEND_TOKEN);
  });

  it('fails with BackendTokenUnavailableError when every exchange attempt stalls', async () => {
    exchange.mockImplementation(() => never());
    const provider = new BackendAuthTokenProvider(async () => CLERK_TOKEN);

    const result = provider.getToken();
    const assertion = expect(result).rejects.toBeInstanceOf(BackendTokenUnavailableError);
    await vi.runAllTimersAsync();

    await assertion;
    expect(exchange).toHaveBeenCalledTimes(3);
    expect(exchange.mock.calls.every(([, options]) => options?.signal?.aborted)).toBe(true);
  });

  it('fails with BackendTokenUnavailableError when Clerk never returns a session token', async () => {
    const provider = new BackendAuthTokenProvider(() => never());

    const result = provider.getToken();
    const assertion = expect(result).rejects.toBeInstanceOf(BackendTokenUnavailableError);
    await vi.runAllTimersAsync();

    await assertion;
    expect(exchange).not.toHaveBeenCalled();
  });

  it('does not keep a failed exchange: the next call exchanges again', async () => {
    exchange.mockRejectedValue(new TypeError('Failed to fetch'));
    const provider = new BackendAuthTokenProvider(async () => CLERK_TOKEN);

    const first = provider.getToken();
    const firstAssertion = expect(first).rejects.toBeInstanceOf(BackendTokenUnavailableError);
    await vi.runAllTimersAsync();
    await firstAssertion;

    exchange.mockReset();
    exchange.mockResolvedValueOnce({ access_token: BACKEND_TOKEN } as never);
    await expect(provider.getToken()).resolves.toBe(BACKEND_TOKEN);
  });

  it('shares one in-flight exchange between concurrent operations', async () => {
    exchange.mockResolvedValueOnce({ access_token: BACKEND_TOKEN } as never);
    const provider = new BackendAuthTokenProvider(async () => CLERK_TOKEN);

    const tokens = await Promise.all([provider.getToken(), provider.getToken(), provider.getToken()]);

    expect(tokens).toEqual([BACKEND_TOKEN, BACKEND_TOKEN, BACKEND_TOKEN]);
    expect(exchange).toHaveBeenCalledTimes(1);
  });

  it('leaves backend decisions (401, 403, 404) to the auth guards: one attempt, no token', async () => {
    exchange.mockRejectedValueOnce(httpError(404));
    const provider = new BackendAuthTokenProvider(async () => CLERK_TOKEN);

    await expect(provider.getToken()).resolves.toBeNull();
    expect(exchange).toHaveBeenCalledTimes(1);
  });
});

describe('isTransientTokenExchangeError', () => {
  it.each([
    ['network failure without status', new TypeError('Load failed'), true],
    ['aborted request', new DOMException('aborted', 'AbortError'), true],
    ['server error', httpError(502), true],
    ['rate limit', httpError(429), true],
    ['unauthorized', httpError(401), false],
    ['forbidden', httpError(403), false],
    ['account still syncing', httpError(404), false],
  ])('%s → %s', (_label, error, expected) => {
    expect(isTransientTokenExchangeError(error)).toBe(expected);
  });
});
