import { afterEach, describe, expect, it, vi } from 'vitest';
import { TokenExchangeService } from '@/services/tokenExchangeService';

describe('TokenExchangeService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges a Clerk token and sends admin-portal client header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'backend-jwt', token_type: 'Bearer', expires_in: 3600 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new TokenExchangeService();
    const result = await service.exchangeClerkToken('clerk-jwt');

    expect(result.access_token).toBe('backend-jwt');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/token-exchange/clerk'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Client-Type': 'admin-portal',
        }),
      })
    );
  });

  it('surfaces HTTP status and code on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ code: 'UNAUTHENTICATED' }),
      })
    );

    const service = new TokenExchangeService();
    await expect(service.exchangeClerkToken('bad')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
  });
});
