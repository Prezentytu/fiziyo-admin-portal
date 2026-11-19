import { getBackendToken } from '@/lib/tokenCache';

/** Flags computed for the signed-in user (`GET /api/me/features`, SPEC-052). A missing key means off. */
export type MeFeatures = Record<string, boolean>;

export function parseMeFeatures(body: unknown): MeFeatures {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === 'boolean'
    )
  );
}

/**
 * The backend JWT lands in sessionStorage after the first GraphQL token exchange, so a null token is "not yet",
 * not "off"; callers retry. Any failure keeps the feature hidden.
 */
export async function fetchMeFeatures(
  baseUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL,
  token: string | null = getBackendToken(),
  fetcher: typeof fetch = fetch
): Promise<MeFeatures | null> {
  if (!baseUrl || !token) return null;
  try {
    const response = await fetcher(`${baseUrl.replace(/\/+$/, '')}/api/me/features`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return response.ok ? parseMeFeatures(await response.json()) : {};
  } catch {
    return {};
  }
}
