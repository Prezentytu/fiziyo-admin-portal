import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CrossOrgVerificationPage from '../page';

const firstPendingRefetch = vi.fn();
let onSubmittedForReview: (() => void) | undefined;

vi.mock('next/navigation', () => ({
  usePathname: () => '/verification/organizations',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/useSystemRole', () => ({
  useSystemRole: () => ({ isSiteSuperAdmin: true, isLoading: false }),
}));

vi.mock('@/features/verification/VerificationPageHeader', () => ({
  VerificationPageHeader: () => null,
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: (
    queryDocument: { definitions?: Array<{ name?: { value?: string } }> },
    options?: { variables?: { pageSize?: number } }
  ) => {
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
      refetch: options?.variables?.pageSize === 1 ? firstPendingRefetch : vi.fn(),
    };
  },
  useMutation: () => [vi.fn(), { loading: false }],
  useSubscription: (_document: unknown, options?: { onData?: () => void }) => {
    onSubmittedForReview = options?.onData;
    return {};
  },
}));

describe('CrossOrgVerificationPage', () => {
  it('renders cross-org stats instead of an endless skeleton once the query resolves', () => {
    render(<CrossOrgVerificationPage />);

    expect(screen.getByTestId('org-verification-stats-pending')).toHaveTextContent('7');
    expect(screen.getByTestId('org-verification-stats-changes')).toHaveTextContent('2');
    expect(screen.getByTestId('org-verification-stats-verified')).toHaveTextContent('5');
    expect(screen.getByTestId('org-verification-stats-archived')).toHaveTextContent('1');
  });

  it('shows the pending count as the main action of the page', () => {
    render(<CrossOrgVerificationPage />);

    expect(screen.getByTestId('cross-org-verification-queue-hero')).toHaveTextContent(
      '7 ćwiczeń czeka na Twoją decyzję'
    );
    expect(screen.queryByTestId('cross-org-verification-start-queue-btn')).not.toBeInTheDocument();
  });

  it('refreshes the first pending exercise together with the queue', () => {
    render(<CrossOrgVerificationPage />);
    firstPendingRefetch.mockClear();

    act(() => onSubmittedForReview?.());

    expect(firstPendingRefetch).toHaveBeenCalled();
  });
});
