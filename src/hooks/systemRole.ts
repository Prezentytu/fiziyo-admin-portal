import type { SystemRole } from './useSystemRole';

export function normalizeSystemRole(rawRole: string | null | undefined): SystemRole | null {
  if (!rawRole) {
    return null;
  }

  const normalizedRole = rawRole.toLowerCase().replace(/_/g, '');
  if (normalizedRole === 'sitesuperadmin') return 'SiteSuperAdmin';
  if (normalizedRole === 'siteadmin') return 'SiteAdmin';
  if (normalizedRole === 'contentmanager') return 'ContentManager';
  return null;
}

export function computeSystemRoleFlags(systemRole: SystemRole | null, isLoading: boolean) {
  const isSiteSuperAdmin = systemRole === 'SiteSuperAdmin';
  const isSiteAdmin = systemRole === 'SiteAdmin';
  const isContentManager = systemRole === 'ContentManager';

  return {
    systemRole,
    isSiteSuperAdmin,
    isSiteAdmin,
    isContentManager,
    canReviewExercises: isSiteSuperAdmin || isContentManager,
    canManageGlobalTags: isSiteSuperAdmin || isContentManager,
    isLoading,
  };
}
