import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectSetStep } from './SelectSetStep';
import type { ExerciseSet } from './types';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

function createExerciseSet(): ExerciseSet {
  return {
    id: 'set-1',
    name: 'Rehab kolana',
    description: 'Zestaw testowy',
    exerciseMappings: [
      {
        id: 'mapping-1',
        exerciseId: 'exercise-1',
        sets: 5,
        reps: 8,
        customName: 'Przysiad przy ścianie',
        customDescription: 'Opis szczegółowy ćwiczenia',
        exercise: {
          id: 'exercise-1',
          name: 'Przysiad',
          patientDescription: 'Opis bazowy',
          imageUrl: '/exercise.jpg',
          videoUrl: 'https://example.com/video.mp4',
          defaultSets: 3,
          defaultReps: 10,
        },
      },
    ],
  };
}

describe('SelectSetStep details flow', () => {
  it('creates a plan from the keyboard with the search text and respects the loading gate', async () => {
    const user = userEvent.setup();
    const onCreateSet = vi.fn();
    const props = { exerciseSets: [], selectedSet: null, onSelectSet: vi.fn(), onCreateSet };
    const { rerender } = render(<SelectSetStep {...props} />);
    await user.type(screen.getByTestId('assign-set-search'), 'Plan testowy');
    const create = screen.getByRole('button', { name: 'Utwórz plan od zera' });
    create.focus();
    await user.keyboard('{Enter}');
    expect(onCreateSet).toHaveBeenCalledWith('Plan testowy');
    rerender(<SelectSetStep {...props} isCreatingSet />);
    expect(create).toBeDisabled();
    await user.click(create);
    expect(onCreateSet).toHaveBeenCalledOnce();
  });

  it('selects a source with the keyboard and clears the selection without changing the set', async () => {
    const user = userEvent.setup();
    const set = createExerciseSet();
    const onSelectSet = vi.fn();
    const { rerender } = render(<SelectSetStep exerciseSets={[set]} selectedSet={null} onSelectSet={onSelectSet} />);
    const option = screen.getByTestId('assign-set-item-set-1');
    expect(option.tagName).toBe('BUTTON');
    expect(option.querySelector('div, p, button')).toBeNull();
    expect(option).toHaveAttribute('aria-pressed', 'false');
    option.focus();
    await user.keyboard(' ');
    expect(onSelectSet).toHaveBeenCalledWith(set);
    rerender(<SelectSetStep exerciseSets={[set]} selectedSet={set} onSelectSet={onSelectSet} />);
    expect(option).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByTestId('selectsetstep-button-121'));
    expect(onSelectSet).toHaveBeenLastCalledWith(null);
  });

  it('opens and closes exercise details dialog from preview list', async () => {
    const user = userEvent.setup();
    const set = createExerciseSet();

    render(<SelectSetStep exerciseSets={[set]} selectedSet={set} onSelectSet={() => {}} />);

    await user.click(screen.getByTestId('assign-set-preview-exercise-row-mapping-1'));

    expect(screen.getByTestId('assign-set-preview-exercise-details-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('assign-set-preview-exercise-details-title')).toHaveTextContent('Przysiad przy ścianie');

    await user.click(screen.getByTestId('assign-set-preview-exercise-details-close-btn'));

    expect(screen.queryByTestId('assign-set-preview-exercise-details-dialog')).not.toBeInTheDocument();
  });

  it('does not open details when thumbnail is clicked', async () => {
    const user = userEvent.setup();
    const set = createExerciseSet();

    render(<SelectSetStep exerciseSets={[set]} selectedSet={set} onSelectSet={() => {}} />);

    await user.click(screen.getByTestId('assign-set-preview-exercise-mapping-1-thumbnail-btn'));

    expect(screen.queryByTestId('assign-set-preview-exercise-details-dialog')).not.toBeInTheDocument();
  });
});
