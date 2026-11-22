'use client';

import { useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from '@apollo/client/react';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { UserByClerkIdResponse } from '@/types/apollo';
import { canReviewExercises as canReview, normalizeSystemRole, type SystemRole } from '@/lib/auth/systemRole';

// ========================================
// Types
// ========================================

/**
 * System-level roles (global, not per-organization)
 * Matches backend SystemRole enum (case-insensitive)
 */
export type { SystemRole } from '@/lib/auth/systemRole';

export interface SystemRoleResult {
  /** Current user's system role (global) */
  systemRole: SystemRole | null;
  /** Whether the user is a SiteSuperAdmin */
  isSiteSuperAdmin: boolean;
  /** Whether the user is a SiteAdmin */
  isSiteAdmin: boolean;
  /** Whether the user is a ContentManager (Weryfikator) */
  isContentManager: boolean;
  /** Whether the user can review/verify exercises (ContentManager or SiteSuperAdmin) */
  canReviewExercises: boolean;
  /** Whether the user can manage global tags (ContentManager or SiteSuperAdmin) */
  canManageGlobalTags: boolean;
  /** Whether the data is still loading */
  isLoading: boolean;
}

// ========================================
// Hook
// ========================================

/**
 * Hook to check user's system-level role and permissions.
 * System roles are global (not per-organization) and grant special admin capabilities.
 *
 * @example
 * ```tsx
 * const { canReviewExercises, isContentManager } = useSystemRole();
 *
 * if (!canReviewExercises) {
 *   return <AccessDenied />;
 * }
 * ```
 *
 * Available system roles:
 * - SiteSuperAdmin: Full system control
 * - SiteAdmin: Can manage global exercises
 * - ContentManager: Can review/approve exercises and manage global tags
 */
export function useSystemRole(): SystemRoleResult {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();

  const { data, loading: queryLoading } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: clerkUser?.id },
    skip: !clerkUser?.id,
  });

  const isLoading = !clerkLoaded || queryLoading;

  return useMemo(() => {
    const rawRole = data?.userByClerkId?.systemRole;

    const systemRole: SystemRole | null = normalizeSystemRole(rawRole);

    const isSiteSuperAdmin = systemRole === 'SiteSuperAdmin';
    const isSiteAdmin = systemRole === 'SiteAdmin';
    const isContentManager = systemRole === 'ContentManager';

    // Permission checks based on backend PermissionService logic:
    // - SiteSuperAdmin has all permissions
    // - ContentManager has ReviewExercises and ManageGlobalTags
    const canReviewExercises = canReview(systemRole);
    const canManageGlobalTags = isSiteSuperAdmin || isContentManager;

    return {
      systemRole,
      isSiteSuperAdmin,
      isSiteAdmin,
      isContentManager,
      canReviewExercises,
      canManageGlobalTags,
      isLoading,
    };
  }, [data?.userByClerkId?.systemRole, isLoading]);
}
