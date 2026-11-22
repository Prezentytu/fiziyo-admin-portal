import { getBackendToken } from '@/lib/tokenCache';

type BackendTokenSource = () => Promise<string | null>;

let activeSource: BackendTokenSource | null = null;

/** ApolloWrapper registers its provider so REST calls get a refreshed token, not a possibly expired cached one. */
export function setActiveBackendTokenSource(source: BackendTokenSource | null): void {
  activeSource = source;
}

export async function getBackendAuthHeaders(): Promise<Record<string, string>> {
  const token = activeSource ? await activeSource().catch(() => null) : getBackendToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
