import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BackendAuthTokenProvider,
  resetBackendAuthTokenProviderForTests,
} from '@/graphql/providers/BackendAuthTokenProvider';
import { clearBackendToken, saveBackendToken } from '@/lib/tokenCache';
import { tokenExchangeService } from '@/services/tokenExchangeService';

vi.mock('@/services/tokenExchangeService', () => ({
  tokenExchangeService: {
    exchangeClerkToken: vi.fn(),
  },
}));

function createJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('BackendAuthTokenProvider', () => {
  afterEach(() => {
    clearBackendToken();
    resetBackendAuthTokenProviderForTests();
    vi.clearAllMocks();
  });

  it('clears cache on refreshToken and re-exchanges', async () => {
    const clerkToken = createJwt({ clerk_id: 'clerk_1', sub: 'clerk_1', exp: Math.floor(Date.now() / 1000) + 3600 });
    const backendToken = createJwt({
      clerk_id: 'clerk_1',
      role: 'therapist',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    vi.mocked(tokenExchangeService.exchangeClerkToken).mockResolvedValue({
      access_token: backendToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });

    const provider = new BackendAuthTokenProvider(async () => clerkToken);
    await expect(provider.getToken()).resolves.toBe(backendToken);

    provider.refreshToken();
    await expect(provider.getToken()).resolves.toBe(backendToken);
    expect(tokenExchangeService.exchangeClerkToken).toHaveBeenCalledTimes(2);
  });

  it('clears cache after 401 and does not return stale token', async () => {
    const clerkToken = createJwt({ clerk_id: 'clerk_1', sub: 'clerk_1', exp: Math.floor(Date.now() / 1000) + 3600 });
    saveBackendToken(
      createJwt({
        clerk_id: 'clerk_1',
        role: 'therapist',
        exp: Math.floor(Date.now() / 1000) + 60,
      })
    );
    const unauthorized = Object.assign(new Error('Token exchange failed: 401'), { status: 401 });
    vi.mocked(tokenExchangeService.exchangeClerkToken).mockRejectedValue(unauthorized);

    const provider = new BackendAuthTokenProvider(async () => clerkToken);
    await expect(provider.getToken()).rejects.toMatchObject({ status: 401 });
    expect(sessionStorage.getItem('BACKEND_JWT_TOKEN')).toBeNull();
  });
});
