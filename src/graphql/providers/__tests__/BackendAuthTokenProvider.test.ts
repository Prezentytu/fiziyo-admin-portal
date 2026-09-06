import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BackendAuthTokenProvider, resetBackendAuthTokenProviderForTests } from '../BackendAuthTokenProvider';
import { getBackendToken, saveBackendToken, clearBackendToken } from '@/lib/tokenCache';
import { tokenExchangeService } from '@/services/tokenExchangeService';

vi.mock('@/lib/tokenCache', () => ({
  getBackendToken: vi.fn(),
  saveBackendToken: vi.fn(),
  clearBackendToken: vi.fn(),
}));

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
  const mockGetBackendToken = vi.mocked(getBackendToken);
  const mockSaveBackendToken = vi.mocked(saveBackendToken);
  const mockClearBackendToken = vi.mocked(clearBackendToken);
  const mockExchangeClerkToken = vi.mocked(tokenExchangeService.exchangeClerkToken);

  beforeEach(() => {
    vi.clearAllMocks();
    resetBackendAuthTokenProviderForTests();
  });

  it('exchanges once for 20 parallel getToken calls', async () => {
    const clerkToken = createJwt({
      sub: 'clerk-user-1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const backendToken = createJwt({
      clerk_id: 'clerk-user-1',
      organization_id: 'org-1',
      role: 'therapist',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    mockGetBackendToken.mockReturnValue(null);
    mockExchangeClerkToken.mockResolvedValue({
      access_token: backendToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });

    const provider = new BackendAuthTokenProvider(async () => clerkToken);
    const tokens = await Promise.all(Array.from({ length: 20 }, () => provider.getToken()));

    expect(new Set(tokens)).toEqual(new Set([backendToken]));
    expect(mockExchangeClerkToken).toHaveBeenCalledTimes(1);
    expect(mockSaveBackendToken).toHaveBeenCalledTimes(1);
  });

  it('does not wipe cache when cached JWT is undecodable', async () => {
    const clerkToken = createJwt({
      sub: 'clerk-user-1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const exchangedToken = createJwt({
      clerk_id: 'clerk-user-1',
      organization_id: 'org-1',
      role: 'owner',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    mockGetBackendToken.mockReturnValue('not.a-valid-payload.sig');
    mockExchangeClerkToken.mockResolvedValue({
      access_token: exchangedToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });

    const provider = new BackendAuthTokenProvider(async () => clerkToken);
    await expect(provider.getToken()).resolves.toBe(exchangedToken);
    expect(mockClearBackendToken).not.toHaveBeenCalled();
  });

  it('exchanges when cached JWT belongs to another user', async () => {
    const clerkToken = createJwt({
      sub: 'clerk-user-2',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const otherUserToken = createJwt({
      clerk_id: 'clerk-user-1',
      organization_id: 'org-1',
      role: 'therapist',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const currentUserToken = createJwt({
      clerk_id: 'clerk-user-2',
      organization_id: 'org-2',
      role: 'therapist',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    mockGetBackendToken.mockReturnValue(otherUserToken);
    mockExchangeClerkToken.mockResolvedValue({
      access_token: currentUserToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });

    const provider = new BackendAuthTokenProvider(async () => clerkToken);

    await expect(provider.getToken()).resolves.toBe(currentUserToken);
    expect(mockExchangeClerkToken).toHaveBeenCalledTimes(1);
  });
});
