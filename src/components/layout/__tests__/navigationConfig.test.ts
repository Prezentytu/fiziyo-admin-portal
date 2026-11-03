import { describe, expect, it } from 'vitest';
import { buildAccountNavigationItems, buildNavigationItems } from '../navigationConfig';
import { isNavigationItemActive } from '../navigationActive';
import { getVerificationScopes } from '@/features/verification/utils/verificationScopes';

const ALL_SCOPES = getVerificationScopes({
  canManageOrganization: true,
  canReviewExercises: true,
  isSiteSuperAdmin: true,
});

describe('buildNavigationItems', () => {
  it('shows only daily clinical work to a therapist', () => {
    const items = buildNavigationItems({ verificationScopes: [], verificationPendingCount: 0 });

    expect(items.map((item) => item.name)).toEqual(['Panel', 'Pacjenci', 'Zestawy', 'Ćwiczenia', 'Import dokumentów']);
  });

  it('adds one verification entry after exercises for every verification scope', () => {
    const items = buildNavigationItems({ verificationScopes: ALL_SCOPES, verificationPendingCount: 3 });

    expect(items.map((item) => item.name)).toEqual([
      'Panel',
      'Pacjenci',
      'Zestawy',
      'Ćwiczenia',
      'Weryfikacja',
      'Import dokumentów',
    ]);
    expect(items[4]).toMatchObject({ href: '/organization/verification', badge: 3 });
  });

  it('opens the global queue first for a content manager without an organization role', () => {
    const scopes = getVerificationScopes({
      canManageOrganization: false,
      canReviewExercises: true,
      isSiteSuperAdmin: false,
    });
    const items = buildNavigationItems({ verificationScopes: scopes, verificationPendingCount: 0 });

    expect(items.find((item) => item.name === 'Weryfikacja')?.href).toBe('/verification');
  });

  it('keeps verification active on every queue', () => {
    const items = buildNavigationItems({ verificationScopes: ALL_SCOPES, verificationPendingCount: 0 });
    const allHrefs = items.flatMap((item) => item.matchHrefs);
    const verification = items.find((item) => item.name === 'Weryfikacja');

    for (const pathname of ['/organization/verification/ex-1', '/verification', '/verification/organizations/ex-2']) {
      expect(isNavigationItemActive(pathname, verification?.matchHrefs ?? [], allHrefs)).toBe(true);
    }
    expect(isNavigationItemActive('/exercises', verification?.matchHrefs ?? [], allHrefs)).toBe(false);
  });
});

describe('buildAccountNavigationItems', () => {
  it('gives organization pages only to admins', () => {
    expect(buildAccountNavigationItems(false)).toEqual([]);
    expect(buildAccountNavigationItems(true).map((item) => item.href)).toEqual(['/organization', '/finances']);
  });
});
