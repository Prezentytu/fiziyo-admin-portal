import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExerciseCard, type Exercise } from './ExerciseCard';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => <span aria-label={alt ?? 'exercise-image'} />,
}));

const baseExercise: Exercise = {
  id: 'exercise-1',
  name: 'Przysiad przy ścianie',
  scope: 'ORGANIZATION',
  status: 'DRAFT',
  mainTags: ['nogi'],
};

describe('ExerciseCard menu actions', () => {
  it('pokazuje akcję report i zachowuje submit to global', async () => {
    const user = userEvent.setup();
    const onSubmitToGlobal = vi.fn();
    const onReportIssue = vi.fn();

    render(
      <ExerciseCard
        exercise={baseExercise}
        compact
        onSubmitToGlobal={onSubmitToGlobal}
        onReportIssue={onReportIssue}
      />
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Zgłoś do Bazy Globalnej')).toBeInTheDocument();
    expect(screen.getByText('Zgłoś do poprawki')).toBeInTheDocument();
    expect(screen.queryByText('nogi')).not.toBeInTheDocument();
    expect(screen.queryByText(/Czas powtórzenia:/)).not.toBeInTheDocument();

    await user.click(screen.getByTestId('exercise-card-exercise-1-report-btn'));
    expect(onReportIssue).toHaveBeenCalledTimes(1);
  });

  it('pokazuje akcję submit do weryfikacji organizacyjnej i badge pending', async () => {
    const user = userEvent.setup();
    const onSubmitToOrganizationReview = vi.fn();

    const { rerender } = render(
      <ExerciseCard
        exercise={{
          ...baseExercise,
          organizationVerificationStatus: 'NOT_SUBMITTED',
        }}
        compact
        onSubmitToOrganizationReview={onSubmitToOrganizationReview}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Zgłoś do weryfikacji organizacyjnej')).toBeInTheDocument();

    await user.click(screen.getByTestId('exercise-card-exercise-1-submit-org-review-btn'));
    expect(onSubmitToOrganizationReview).toHaveBeenCalledTimes(1);

    rerender(
      <ExerciseCard
        exercise={{
          ...baseExercise,
          organizationVerificationStatus: 'PENDING_ORG_REVIEW',
        }}
        compact
        onSubmitToOrganizationReview={onSubmitToOrganizationReview}
      />
    );

    expect(screen.getByText('Oczekuje na weryfikację org')).toBeInTheDocument();
  });
});
