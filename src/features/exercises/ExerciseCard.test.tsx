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
  it('przy własnym ćwiczeniu gabinetu pokazuje zgłoszenie do weryfikacji, a nie „Zgłoś do poprawki”', async () => {
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

    await user.click(screen.getByRole('button', { name: /Więcej opcji/ }));

    expect(screen.getByText('Zgłoś do Bazy Globalnej')).toBeInTheDocument();
    expect(screen.queryByText('Zgłoś do poprawki')).not.toBeInTheDocument();
    expect(screen.queryByText('nogi')).not.toBeInTheDocument();
    expect(screen.queryByText(/Czas powtórzenia:/)).not.toBeInTheDocument();
  });

  it('przy ćwiczeniu z bazy FiziYo fizjoterapeuta zgłasza błąd do poprawki', async () => {
    const user = userEvent.setup();
    const onReportIssue = vi.fn();

    render(<ExerciseCard exercise={{ ...baseExercise, scope: 'GLOBAL' }} compact onReportIssue={onReportIssue} />);

    await user.click(screen.getByRole('button', { name: /Więcej opcji/ }));
    await user.click(screen.getByTestId('exercise-card-exercise-1-report-btn'));

    expect(onReportIssue).toHaveBeenCalledTimes(1);
  });

  it('weryfikator FiziYo nie widzi „Zgłoś do poprawki” przy ćwiczeniu globalnym', async () => {
    const user = userEvent.setup();

    render(
      <ExerciseCard
        exercise={{ ...baseExercise, scope: 'GLOBAL' }}
        compact
        onReportIssue={vi.fn()}
        canReviewExercises
      />
    );

    await user.click(screen.getByRole('button', { name: /Więcej opcji/ }));

    expect(screen.queryByTestId('exercise-card-exercise-1-report-btn')).not.toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /Więcej opcji/ }));
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

describe('ExerciseCard pula demo', () => {
  it.each([true, false])('oznacza ćwiczenie z puli demo znaczkiem „Demo” (compact=%s)', (compact) => {
    render(<ExerciseCard exercise={{ ...baseExercise, scope: 'GLOBAL', availability: 'DEMO' }} compact={compact} />);

    expect(screen.getByTestId('exercise-card-exercise-1-demo-badge')).toHaveTextContent('Demo');
  });

  it('nie oznacza zwykłego ćwiczenia ani ćwiczenia bez pola dostępności', () => {
    const { rerender } = render(<ExerciseCard exercise={{ ...baseExercise, availability: 'STANDARD' }} />);
    expect(screen.queryByTestId('exercise-card-exercise-1-demo-badge')).not.toBeInTheDocument();

    rerender(<ExerciseCard exercise={baseExercise} />);
    expect(screen.queryByTestId('exercise-card-exercise-1-demo-badge')).not.toBeInTheDocument();
  });
});
