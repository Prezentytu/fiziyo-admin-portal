import { describe, expect, it } from 'vitest';
import { filterNavigationGroups, getRouteLabel, navigationGroups } from '@/components/layout/navigation.config';

describe('navigation.config', () => {
  it('uses consistent IA labels', () => {
    expect(navigationGroups.map((group) => group.label)).toEqual([
      'Klinika',
      'Narzędzia AI',
      'Organizacja',
      'Weryfikacja',
    ]);
    expect(getRouteLabel('finances')).toBe('Finanse');
    expect(getRouteLabel('payouts')).toBe('Wypłaty');
    expect(getRouteLabel('organizations')).toBe('Organizacje');
    expect(getRouteLabel('onboarding')).toBe('Onboarding');
  });

  it('hides admin and verification groups by access', () => {
    const therapistGroups = filterNavigationGroups(navigationGroups, {
      canManageOrganization: false,
      canReviewExercises: false,
      isSiteSuperAdmin: false,
    });
    expect(therapistGroups.map((group) => group.id)).toEqual(['clinic', 'ai-tools']);

    const reviewerGroups = filterNavigationGroups(navigationGroups, {
      canManageOrganization: true,
      canReviewExercises: true,
      isSiteSuperAdmin: false,
    });
    expect(reviewerGroups.some((group) => group.id === 'verification')).toBe(true);
    expect(
      reviewerGroups.flatMap((group) => group.items).some((item) => item.href === '/verification/organizations')
    ).toBe(false);
  });
});
