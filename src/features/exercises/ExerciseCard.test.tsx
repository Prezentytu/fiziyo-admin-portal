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

    await user.click(screen.getByTestId('exercise-card-exercise-1-report-btn'));
    expect(onReportIssue).toHaveBeenCalledTimes(1);
  });
});
