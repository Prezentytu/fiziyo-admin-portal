export const LAST_ORG_KEY = 'fizyo_last_organization_id';

export function getLastOrganizationId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(LAST_ORG_KEY);
  } catch {
    return null;
  }
}

export function setLastOrganizationId(orgId: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(LAST_ORG_KEY, orgId);
  } catch {
    // Ignore localStorage errors
  }
}
