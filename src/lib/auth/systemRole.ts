/**
 * Global backoffice roles. The backend returns them in SCREAMING_SNAKE_CASE (e.g. `CONTENT_MANAGER`).
 */
export type SystemRole = 'SiteSuperAdmin' | 'SiteAdmin' | 'ContentManager';

const SYSTEM_ROLES: Record<string, SystemRole> = {
  sitesuperadmin: 'SiteSuperAdmin',
  siteadmin: 'SiteAdmin',
  contentmanager: 'ContentManager',
};

export function normalizeSystemRole(rawRole: string | null | undefined): SystemRole | null {
  if (!rawRole) return null;
  return SYSTEM_ROLES[rawRole.toLowerCase().replace(/_/g, '')] ?? null;
}

/** Matches PermissionService in the backend: exercise review for ContentManager and SiteSuperAdmin. */
export function canReviewExercises(role: SystemRole | null): boolean {
  return role === 'SiteSuperAdmin' || role === 'ContentManager';
}
