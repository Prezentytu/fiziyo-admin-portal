import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VerificationStatsCards } from './VerificationStatsCards';
import type { VerificationStats } from '@/graphql/types/adminExercise.types';

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
});
