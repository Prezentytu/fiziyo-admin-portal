import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CurrentBillingStatus } from '@/types/apollo';
import { BillingOverviewContent } from './BillingOverview';

afterEach(cleanup);
const status: CurrentBillingStatus = {
  organizationId: 'clinic', month: 9, year: 2026, activePatientsInMonth: 2,
  currentlyActivePremium: 2, pricePerPatient: 25.35, estimatedTotal: 50.7,
  currency: 'PLN', isPilotMode: false, therapistBreakdown: [],
};

describe('BillingOverview', () => {
  it('does not show stale money when refresh fails and permits retry', () => {
    const retry = vi.fn();
    render(<BillingOverviewContent status={status} loading={false} failed onRetry={retry} />);
    expect(screen.queryByTestId('finances-billing-amount')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('page-error-retry'));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('does not describe missing data as a free pilot', () => {
    render(<BillingOverviewContent loading={false} failed={false} onRetry={vi.fn()} />);
    expect(screen.getByTestId('finances-billing-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('finances-billing-mode')).not.toBeInTheDocument();
  });

  it('hides previous values while refreshing', () => {
    render(<BillingOverviewContent status={status} loading failed={false} onRetry={vi.fn()} />);
    expect(screen.getByTestId('finances-billing-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('finances-billing-amount')).not.toBeInTheDocument();
  });

  it('shows the backend estimate as an estimate, not collected revenue', () => {
    render(<BillingOverviewContent status={status} loading={false} failed={false} onRetry={vi.fn()} />);
    expect(screen.getByTestId('finances-billing-mode')).toHaveTextContent('Rozliczenia płatne');
    expect(screen.getByTestId('finances-billing-amount')).toHaveTextContent('50,70');
    expect(screen.getByTestId('finances-billing-rate')).toHaveTextContent('25,35');
    expect(screen.getByTestId('finances-billing-rules')).toHaveTextContent('Aktywny dostęp nie potwierdza zapłaty');
  });

  it('identifies a pilot from the backend flag', () => {
    render(<BillingOverviewContent status={{ ...status, isPilotMode: true, pricePerPatient: 0, estimatedTotal: 0 }} loading={false} failed={false} onRetry={vi.fn()} />);
    expect(screen.getByTestId('finances-billing-mode')).toHaveTextContent('Darmowy pilotaż');
    expect(screen.getByTestId('finances-billing-amount')).toHaveTextContent('0,00');
  });

  it('does not assume a zero price means a pilot', () => {
    render(<BillingOverviewContent status={{ ...status, pricePerPatient: 0, estimatedTotal: 0 }} loading={false} failed={false} onRetry={vi.fn()} />);
    expect(screen.getByTestId('finances-billing-mode')).toHaveTextContent('Bez opłat za dostęp');
  });
});
