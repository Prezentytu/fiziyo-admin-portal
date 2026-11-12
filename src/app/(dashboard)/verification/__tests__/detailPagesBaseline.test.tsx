import { Suspense, type ComponentType } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentNode } from 'graphql';

import CatalogVerificationDetailPage from '../[id]/page';
import CrossOrgVerificationDetailPage from '../organizations/[id]/page';
import OrganizationVerificationDetailPage from '../../organization/verification/[id]/page';
import {
  GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY,
  GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY,
} from '@/graphql/queries/adminExercises.queries';
import { GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY } from '@/graphql/queries/crossOrgVerification.queries';

/**
 * Odbiór 12.11 (F6). Formularz weryfikacji bierze stan bazowy raz, przy otwarciu ćwiczenia, i z nim porównuje
 * dokument z bazy przed zapisem rekordu 3.3. Stan bazowy z cache (starszy niż baza, np. po imporcie w tle)
 * dawał fałszywy konflikt przy pierwszym zapisie, więc zapytanie o ćwiczenie idzie zawsze do sieci.
 */

const { useQuery } = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('@apollo/client/react', () => ({
  useQuery,
  useMutation: () => [vi.fn(), { loading: false }],
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({ currentOrganization: { organizationId: 'org-1' } }),
}));
vi.mock('@/hooks/useSystemRole', () => ({
  useSystemRole: () => ({ canReviewExercises: true, isSiteSuperAdmin: true, isLoading: false }),
}));
vi.mock('@/hooks/useRoleAccess', () => ({
  useRoleAccess: () => ({ canManageOrganization: true, isLoading: false }),
}));
vi.mock('@/services/exerciseReportService', () => ({ getExerciseReports: async () => [] }));
vi.mock('@/features/verification/VerificationWorkspace', () => ({ VerificationWorkspace: () => null }));
vi.mock('@/features/verification/VerificationWorkspaceSkeleton', () => ({ VerificationWorkspaceSkeleton: () => null }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

type DetailPage = ComponentType<{ params: Promise<{ id: string }> }>;

async function fetchPolicyOf(Page: DetailPage, query: DocumentNode): Promise<unknown> {
  const params = Promise.resolve({ id: 'exercise-1' });
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <Page params={params} />
      </Suspense>
    );
    await params;
  });
  const call = useQuery.mock.calls.find(([document]) => document === query);
  expect(call, 'strona nie pyta o ćwiczenie').toBeDefined();
  return (call?.[1] as { fetchPolicy?: string } | undefined)?.fetchPolicy;
}

beforeEach(() => {
  useQuery.mockReset();
  useQuery.mockReturnValue({ data: undefined, loading: true, error: undefined, refetch: vi.fn() });
});
afterEach(cleanup);

describe('strony szczegółu weryfikacji: stan bazowy do porównania z sieci', () => {
  it.each<[string, DetailPage, DocumentNode]>([
    ['katalog FiziYo', CatalogVerificationDetailPage, GET_EXERCISE_BY_ID_FOR_ADMIN_QUERY],
    ['gabinet', OrganizationVerificationDetailPage, GET_EXERCISE_BY_ID_FOR_ORG_VERIFICATION_QUERY],
    ['kolejki gabinetów (backoffice)', CrossOrgVerificationDetailPage, GET_EXERCISE_BY_ID_FOR_CROSS_ORG_VERIFICATION_QUERY],
  ])('%s: ćwiczenie nie przychodzi z cache', async (_name, Page, query) => {
    expect(await fetchPolicyOf(Page, query)).toBe('network-only');
  });
});
