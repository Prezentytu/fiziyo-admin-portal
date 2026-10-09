const FALLBACK_ORIGIN = 'https://app.fizjo.pl';

/** Link do zaproszenia członka organizacji, budowany na aktualnym originie portalu. */
export function buildInviteUrl(token: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : FALLBACK_ORIGIN;
  return `${baseUrl}/invite?token=${token}`;
}
