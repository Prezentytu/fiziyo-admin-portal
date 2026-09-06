'use client';

import { useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from '@apollo/client/react';
import { GET_USER_BY_CLERK_ID_QUERY } from '@/graphql/queries/users.queries';
import type { UserByClerkIdResponse } from '@/types/apollo';
import { useOptionalCurrentUser } from '@/contexts/CurrentUserContext';
import { computeSystemRoleFlags, normalizeSystemRole } from '@/hooks/systemRole';

// ========================================
// Types
// ========================================

/**
 * System-level roles (global, not per-organization)
 * Matches backend SystemRole enum (case-insensitive)
 */
export type SystemRole = 'SiteSuperAdmin' | 'SiteAdmin' | 'ContentManager';

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
  const currentUser = useOptionalCurrentUser();

  const { data, loading: queryLoading } = useQuery<UserByClerkIdResponse>(GET_USER_BY_CLERK_ID_QUERY, {
    variables: { clerkId: clerkUser?.id },
    skip: !clerkUser?.id || Boolean(currentUser),
  });

  const isLoading = currentUser ? currentUser.isLoading : !clerkLoaded || queryLoading;
  const rawRole = currentUser?.user?.systemRole ?? data?.userByClerkId?.systemRole;

  return useMemo(() => computeSystemRoleFlags(normalizeSystemRole(rawRole), isLoading), [isLoading, rawRole]);
}
