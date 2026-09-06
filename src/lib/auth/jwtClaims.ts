export interface JwtPayload {
  [key: string]: unknown;
}

function decodeBase64Url(value: string): string | null {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = `${normalized}${'='.repeat((4 - (normalized.length % 4)) % 4)}`;

  try {
    if (typeof atob === 'function') {
      return atob(padded);
    }

    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) {
      return null;
    }

    const json = decodeBase64Url(parts[1]);
    if (!json) {
      return null;
    }

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getUserRoleFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  const roleClaim = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
  if (typeof roleClaim === 'string') {
    return roleClaim;
  }

  if (typeof payload.role === 'string') {
    return payload.role;
  }

  return null;
}

/**
 * Zwraca Clerk user id (claim `clerk_id`) zaszyte w backendowym JWT.
 * Pozwala zweryfikować, że cache'owany token należy do AKTUALNIE zalogowanego użytkownika Clerk,
 * a nie do poprzedniej sesji (np. fizjo → wylogowanie → login pacjenta w tej samej przeglądarce).
 */
export function getClerkIdFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  if (typeof payload.clerk_id === 'string' && payload.clerk_id.length > 0) {
    return payload.clerk_id;
  }

  if (typeof payload.ClerkId === 'string' && payload.ClerkId.length > 0) {
    return payload.ClerkId;
  }

  if (typeof payload.sub === 'string' && payload.sub.length > 0) {
    return payload.sub;
  }

  return null;
}
