/**
 * Pure helpers for TeamSection filtering. Exported for unit tests.
 */

export type RoleFilter = 'all' | 'admin' | 'therapist';

const STAFF_ROLES = new Set(['owner', 'admin', 'therapist', 'member']);

export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.has(role.toLowerCase());
}

/**
 * Returns true if a member with the given role should be shown for the given role filter.
 * - all: show all staff roles
 * - admin: show owner and admin
 * - therapist: show therapist and owner (owner counts as therapist for display)
 */
export function passesRoleFilter(memberRole: string, roleFilter: RoleFilter): boolean {
  if (roleFilter === 'all') return true;
  const role = memberRole.toLowerCase();
  if (roleFilter === 'admin') return role === 'owner' || role === 'admin';
  if (roleFilter === 'therapist') return role === 'therapist' || role === 'owner';
  return false;
}
