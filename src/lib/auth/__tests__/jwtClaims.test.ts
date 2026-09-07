import { describe, expect, it } from 'vitest';

import { decodeJwtPayload, getClerkIdFromToken } from '../jwtClaims';

function createJwt(payload: Record<string, unknown>, mode: 'base64' | 'base64url' = 'base64url'): string {
  const encode = (value: unknown) => {
    const raw = Buffer.from(JSON.stringify(value)).toString('base64');
    if (mode === 'base64') {
      return raw;
    }

    return raw.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  };

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('jwtClaims', () => {
  it('decodes production base64url JWT without padding', () => {
    const token = createJwt({
      clerk_id: 'clerk_user_1',
      organization_id: 'org-1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(decodeJwtPayload(token)).toEqual(
      expect.objectContaining({
        clerk_id: 'clerk_user_1',
        organization_id: 'org-1',
      })
    );
    expect(getClerkIdFromToken(token)).toBe('clerk_user_1');
  });

  it('returns null for an undecodable payload', () => {
    expect(decodeJwtPayload('not.a-valid-payload.sig')).toBeNull();
    expect(getClerkIdFromToken('not.a-valid-payload.sig')).toBeNull();
  });
});
