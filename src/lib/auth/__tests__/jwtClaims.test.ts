import { describe, expect, it } from 'vitest';

import { decodeJwtPayload, getUserRoleFromToken } from '../jwtClaims';

/** JWT koduje segmenty w base64url bez paddingu (RFC 7515), nie w zwykłym base64. */
function tokenWith(payload: Record<string, unknown>): string {
  const segment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${segment}.sig`;
}

describe('decodeJwtPayload', () => {
  it('reads a payload whose base64url form contains - and _', () => {
    const payload = { clerk_id: 'user_a', role: 'patient', note: '???>>>' };
    const token = tokenWith(payload);
    expect(token.split('.')[1]).toMatch(/[-_]/);

    expect(decodeJwtPayload(token)).toEqual(payload);
    expect(getUserRoleFromToken(token)).toBe('patient');
  });

  it('reads Polish characters in claims', () => {
    expect(decodeJwtPayload(tokenWith({ name: 'Łucja Żółć' }))).toEqual({ name: 'Łucja Żółć' });
  });

  it('returns null for a malformed token', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.%%%.c')).toBeNull();
  });
});
