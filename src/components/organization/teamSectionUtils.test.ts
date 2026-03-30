import { describe, it, expect } from 'vitest';
import { isStaffRole, passesRoleFilter, type RoleFilter } from './teamSectionUtils';

describe('teamSectionUtils', () => {
  describe('isStaffRole', () => {
    it('returns true for owner, admin, therapist, member', () => {
      expect(isStaffRole('owner')).toBe(true);
      expect(isStaffRole('admin')).toBe(true);
      expect(isStaffRole('therapist')).toBe(true);
      expect(isStaffRole('member')).toBe(true);
    });

    it('returns true for role in any case', () => {
      expect(isStaffRole('OWNER')).toBe(true);
      expect(isStaffRole('Admin')).toBe(true);
      expect(isStaffRole('Therapist')).toBe(true);
    });

    it('returns false for patient and unknown roles', () => {
      expect(isStaffRole('patient')).toBe(false);
      expect(isStaffRole('')).toBe(false);
      expect(isStaffRole('guest')).toBe(false);
    });
  });

  describe('passesRoleFilter', () => {
    it('for filter "all" passes any staff role', () => {
      const filter: RoleFilter = 'all';
      expect(passesRoleFilter('owner', filter)).toBe(true);
      expect(passesRoleFilter('admin', filter)).toBe(true);
      expect(passesRoleFilter('therapist', filter)).toBe(true);
      expect(passesRoleFilter('member', filter)).toBe(true);
    });

    it('for filter "admin" passes only owner and admin', () => {
      const filter: RoleFilter = 'admin';
      expect(passesRoleFilter('owner', filter)).toBe(true);
      expect(passesRoleFilter('admin', filter)).toBe(true);
      expect(passesRoleFilter('therapist', filter)).toBe(false);
      expect(passesRoleFilter('member', filter)).toBe(false);
    });

    it('for filter "therapist" passes therapist and owner', () => {
      const filter: RoleFilter = 'therapist';
      expect(passesRoleFilter('therapist', filter)).toBe(true);
      expect(passesRoleFilter('owner', filter)).toBe(true);
      expect(passesRoleFilter('admin', filter)).toBe(false);
      expect(passesRoleFilter('member', filter)).toBe(false);
    });

    it('treats role case-insensitively', () => {
      expect(passesRoleFilter('OWNER', 'therapist')).toBe(true);
      expect(passesRoleFilter('Therapist', 'therapist')).toBe(true);
      expect(passesRoleFilter('ADMIN', 'admin')).toBe(true);
    });
  });
});
