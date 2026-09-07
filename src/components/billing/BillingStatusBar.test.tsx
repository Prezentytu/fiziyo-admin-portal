import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetCurrentBillingStatusResponse } from '@/types/apollo';
import { BillingStatusBar } from './BillingStatusBar';

type BillingFixture = Pick<
  NonNullable<GetCurrentBillingStatusResponse['currentBillingStatus']>,
  'estimatedTotal' | 'activePatientsInMonth' | 'currency' | 'isPilotMode'
> & Partial<Pick<NonNullable<GetCurrentBillingStatusResponse['currentBillingStatus']>, 'currentlyActivePremium'>>;

const state = vi.hoisted(() => ({
  billing: null as BillingFixture | null,
  loading: false,
  error: null as Error | null,
  query: vi.fn(),
}));

vi.mock('@apollo/client/react', () => ({
  useQuery: (query: unknown, options: unknown) => {
    state.query(query, options);
    return { data: { currentBillingStatus: state.billing }, loading: state.loading, error: state.error };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.loading = false;
  state.error = null;
  state.billing = {
    estimatedTotal: 156,
    activePatientsInMonth: 6,
    currentlyActivePremium: 4,
    currency: 'PLN',
    isPilotMode: false,
  };
});

afterEach(cleanup);

describe('BillingStatusBar', () => {
  it('keeps the scoped finances link, current active count and amount from the response', () => {
    render(<BillingStatusBar organizationId="organization-1" />);
    const link = screen.getByTestId('dashboard-billing-status-bar');

    expect(link).toHaveAttribute('href', '/finances');
    expect(link).toHaveTextContent('156 PLN');
    expect(link).toHaveTextContent('4 aktywnych');
    expect(link).not.toHaveTextContent('6 aktywnych');
    expect(state.query).toHaveBeenCalledWith(expect.anything(), {
      variables: { organizationId: 'organization-1' },
      skip: false,
      errorPolicy: 'all',
    });
    link.focus();
    expect(link).toHaveFocus();
    expect(screen.getByText('156 PLN')).toHaveClass('whitespace-nowrap', 'text-foreground');
    expect(link).not.toHaveClass('rounded-xl', 'backdrop-blur-sm');
  });

  it('preserves pilot zero amount and early access label', () => {
    state.billing = { ...state.billing!, isPilotMode: true };
    render(<BillingStatusBar organizationId="organization-1" />);

    expect(screen.getByText('0 PLN')).toBeInTheDocument();
    expect(screen.getByText('Wczesny dostęp')).toBeInTheDocument();
    expect(screen.queryByText('156 PLN')).not.toBeInTheDocument();
  });

  it('preserves the legacy monthly count fallback and singular label', () => {
    state.billing = { ...state.billing!, currentlyActivePremium: undefined, activePatientsInMonth: 1 };
    render(<BillingStatusBar organizationId="organization-1" />);
    expect(screen.getByText('1 aktywny')).toBeInTheDocument();
  });

  it('does not replace a current zero count with the monthly count', () => {
    state.billing = { ...state.billing!, currentlyActivePremium: 0 };
    render(<BillingStatusBar organizationId="organization-1" />);

    expect(screen.getByText('Aktywuj pierwszego')).toBeInTheDocument();
    expect(screen.getByText('156 PLN')).toBeInTheDocument();
    expect(screen.queryByText('6 aktywnych')).not.toBeInTheDocument();
  });

  it('shows an accessible loading state without a premature amount', () => {
    state.loading = true;
    render(<BillingStatusBar organizationId="organization-1" />);

    expect(screen.getByRole('status', { name: 'Ładowanie rozliczenia' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it.each(['error', 'missing'])('keeps the bar hidden for %s data', (condition) => {
    if (condition === 'error') state.error = new Error('Unavailable');
    else state.billing = null;
    render(<BillingStatusBar organizationId="organization-1" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/PLN/)).not.toBeInTheDocument();
  });
});
