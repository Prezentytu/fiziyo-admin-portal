"use client";

import { useMemo } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";

// ========================================
// Types
// ========================================

export type OrganizationRole = "owner" | "admin" | "therapist" | "member" | "staff";

export interface RoleAccessResult {
  /** Current user's role in the organization (lowercase) */
  role: OrganizationRole | null;
  /** Whether the user is the owner of the organization */
  isOwner: boolean;
  /** Whether the user is an admin of the organization */
  isAdmin: boolean;
  /** Whether the user is a therapist in the organization */
  isTherapist: boolean;
  /** Whether the user can manage organization settings (owner or admin) */
  canManageOrganization: boolean;
  /** Whether the user can view billing information (owner or admin) */
  canViewBilling: boolean;
  /** Whether the user can manage team members (owner or admin) */
  canManageTeam: boolean;
  /** Whether the organization context is still loading */
  isLoading: boolean;
}

// ========================================
// Hook
// ========================================

/**
 * Hook to check user's role-based access permissions in the current organization.
 *
 * @example
 * ```tsx
 * const { canManageOrganization, isOwner } = useRoleAccess();
 *
 * if (!canManageOrganization) {
 *   return <AccessDenied />;
 * }
 * ```
 */
export function useRoleAccess(): RoleAccessResult {
  const { currentOrganization, isLoading } = useOrganization();

  return useMemo(() => {
    const role = (currentOrganization?.role?.toLowerCase() as OrganizationRole) || null;

    const isOwner = role === "owner";
    const isAdmin = role === "admin";
    const isTherapist = role === "therapist";

    // Owner and Admin can manage organization settings
    const canManageOrganization = isOwner || isAdmin;

    // Owner and Admin can view billing
    const canViewBilling = isOwner || isAdmin;

    // Owner and Admin can manage team members
    const canManageTeam = isOwner || isAdmin;

    return {
      role,
      isOwner,
      isAdmin,
      isTherapist,
      canManageOrganization,
      canViewBilling,
      canManageTeam,
      isLoading,
    };
  }, [currentOrganization?.role, isLoading]);
}
