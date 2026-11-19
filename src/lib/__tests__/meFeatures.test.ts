import { describe, expect, it, vi } from 'vitest';

import { fetchMeFeatures, parseMeFeatures } from '../meFeatures';

describe('parseMeFeatures', () => {
  it('zostawia tylko flagi logiczne', () => {
    expect(parseMeFeatures({ referrals: true, voiceCues: false, junk: 'yes' })).toEqual({
      referrals: true,
      voiceCues: false,
    });
    expect(parseMeFeatures(null)).toEqual({});
    expect(parseMeFeatures([true])).toEqual({});
  });
});

describe('fetchMeFeatures', () => {
  it('bez tokenu backendu zwraca null (wołający ponowi)', async () => {
    const fetcher = vi.fn();
    expect(await fetchMeFeatures('https://api', null, fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('woła /api/me/features z tokenem backendu', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ referrals: true }) });
    expect(await fetchMeFeatures('https://api/', 'jwt', fetcher)).toEqual({ referrals: true });
    expect(fetcher).toHaveBeenCalledWith('https://api/api/me/features', {
      headers: { Authorization: 'Bearer jwt' },
      cache: 'no-store',
    });
  });

  it('błąd odpowiedzi albo sieci wyłącza funkcje', async () => {
    expect(await fetchMeFeatures('https://api', 'jwt', vi.fn().mockResolvedValue({ ok: false }))).toEqual({});
    expect(await fetchMeFeatures('https://api', 'jwt', vi.fn().mockRejectedValue(new Error('offline')))).toEqual({});
  });
});
