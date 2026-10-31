import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CrossOrgVerificationPage from '../page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/verification/organizations',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/useSystemRole', () => ({
  useSystemRole: () => ({ isSiteSuperAdmin: true, isLoading: false }),
}));

vi.mock('@/features/verification/VerificationScopeTabs', () => ({
  VerificationScopeTabs: () => null,
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: (queryDocument: { definitions?: Array<{ name?: { value?: string } }> }) => {
    const operationName = queryDocument.definitions?.[0]?.name?.value;
    if (operationName === 'GetCrossOrgVerificationStats') {
      return {
        data: {
          crossOrgVerificationStats: {
            notSubmitted: 0,
            pendingOrgReview: 7,
            orgChangesRequested: 2,
            orgVerified: 5,
            orgArchived: 1,
            total: 15,
          },
        },
        loading: false,
        refetch: vi.fn(),
      };
    }
    return {
      data: {
        crossOrgVerificationQueuePage: {
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
          filter: 'pending',
          search: null,
        },
      },
      loading: false,
      refetch: vi.fn(),
    };
  },
  useMutation: () => [vi.fn(), { loading: false }],
  useSubscription: () => ({}),
}));

describe('CrossOrgVerificationPage', () => {
  it('renders cross-org stats instead of an endless skeleton once the query resolves', () => {
    render(<CrossOrgVerificationPage />);

    expect(screen.getByTestId('org-verification-stats-pending')).toHaveTextContent('7');
    expect(screen.getByTestId('org-verification-stats-changes')).toHaveTextContent('2');
    expect(screen.getByTestId('org-verification-stats-verified')).toHaveTextContent('5');
    expect(screen.getByTestId('org-verification-stats-archived')).toHaveTextContent('1');
  });
});
