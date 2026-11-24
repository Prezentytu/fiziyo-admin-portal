import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VerificationStatsCards } from './VerificationStatsCards';
import type { OrganizationVerificationStats, VerificationStats } from '@/graphql/types/adminExercise.types';

const statsFixture: VerificationStats = {
  pendingReview: 12,
  changesRequested: 3,
  approved: 5,
  published: 44,
  archivedGlobal: 6,
  total: 70,
};

describe('VerificationStatsCards', () => {
  it('pokazuje licznik zgłoszonych i obsługuje zmianę filtra', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    render(
      <VerificationStatsCards
        stats={statsFixture}
        activeFilter="pending"
        reportedCount={7}
        onFilterChange={onFilterChange}
      />
    );

    expect(screen.getByText('Zgłoszone')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    await user.click(screen.getByTestId('verification-stats-reported'));

    expect(onFilterChange).toHaveBeenCalledWith('reported');
  });

  it('w kolejce wszystkich gabinetów pokazuje filtr „Czeka na poprawki”', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const organizationStats: OrganizationVerificationStats = {
      notSubmitted: 0,
      pendingOrgReview: 4,
      orgChangesRequested: 1,
      orgVerified: 9,
      orgArchived: 0,
      internalFixes: 2,
      total: 16,
    };

    render(
      <VerificationStatsCards
        mode="organization"
        stats={null}
        organizationStats={organizationStats}
        activeFilter="pending"
        onFilterChange={onFilterChange}
      />
    );

    expect(screen.getByTestId('org-verification-stats-internal')).toHaveTextContent('Czeka na poprawki2');
    await user.click(screen.getByTestId('org-verification-stats-internal'));
    expect(onFilterChange).toHaveBeenCalledWith('internal');
  });

  it('bez licznika poprawek wewnętrznych (kolejka właściciela gabinetu) nie pokazuje tego filtra', () => {
    render(
      <VerificationStatsCards
        mode="organization"
        stats={null}
        organizationStats={{
          notSubmitted: 0,
          pendingOrgReview: 4,
          orgChangesRequested: 1,
          orgVerified: 9,
          orgArchived: 0,
          total: 14,
        }}
        activeFilter="pending"
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('org-verification-stats-internal')).not.toBeInTheDocument();
  });

  it('w kolejce globalnej filtr poprawek wewnętrznych nazywa się jak plakietka', () => {
    render(
      <VerificationStatsCards
        stats={{ ...statsFixture, internalFixes: 3 }}
        activeFilter="pending"
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByTestId('verification-stats-internal')).toHaveTextContent('Czeka na poprawki3');
  });
});
