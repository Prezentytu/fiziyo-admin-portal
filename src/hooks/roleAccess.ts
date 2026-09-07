import { canImportCatalog } from '@/lib/organization/catalogImportAccess';
import type { OrganizationRole, RoleAccessResult } from './useRoleAccess';

export function computeRoleAccess(roleValue: string | null | undefined, isLoading: boolean): RoleAccessResult {
  const role = (roleValue?.toLowerCase() as OrganizationRole) || null;
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isTherapist = role === 'therapist';
  const canManageOrganization = isOwner || isAdmin;

  return {
    role,
    isOwner,
    isAdmin,
    isTherapist,
    canManageOrganization,
    canViewBilling: canManageOrganization,
    canManageTeam: canManageOrganization,
    canImportCatalog: canImportCatalog(role),
    isLoading,
  };
}
