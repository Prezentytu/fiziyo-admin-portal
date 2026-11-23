export interface JwtPayload {
  [key: string]: unknown;
}

/** A JWT segment is unpadded base64url and claims may be UTF-8 (names); plain `atob` throws or garbles them. */
function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    if (!payload) {
      return null;
    }

    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
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

  return typeof payload.clerk_id === 'string' ? payload.clerk_id : null;
}
