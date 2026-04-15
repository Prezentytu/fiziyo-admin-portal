import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseExecutionCard } from '../ExerciseExecutionCard';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

describe('ExerciseExecutionCard inline read-only source info', () => {
  it('shows source info fields and opens full details action', async () => {
    const user = userEvent.setup();
    const onOpenDetails = vi.fn();

    render(
      <ExerciseExecutionCard
        mode="edit"
        defaultExpanded
        testIdPrefix="exercise-card"
        onOpenDetails={onOpenDetails}
        exercise={{
          id: 'exercise-1',
          displayName: 'Przysiad',
          sets: 3,
          reps: 10,
          executionTime: 8,
          restSets: 45,
          tempo: '3-1-2-0',
          side: 'both',
          preparationTime: 5,
          rangeOfMotion: 'Pełny zakres',
          clinicalDescription: 'Opis kliniczny',
          audioCue: 'Oddychaj',
          mainTags: ['nogi'],
          additionalTags: ['mobilizacja'],
        }}
      />
    );

    expect(screen.getByTestId('exercise-card-exercise-1-help-sets')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-reps')).toBeInTheDocument();

    await user.click(screen.getByTestId('exercise-card-exercise-1-advanced-toggle'));

    expect(screen.getByTestId('exercise-card-exercise-1-source-help-tempo')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-executionTime')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-restSets')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-load')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-notes')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-restReps')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-preparationTime')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-tempo')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-side')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-customName')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-help-customDescription')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-card-exercise-1-open-details-btn')).toBeInTheDocument();
    expect(screen.getByText('Obciążenie')).toBeInTheDocument();
    expect(screen.queryByText('nogi')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('exercise-card-exercise-1-open-details-btn'));

    expect(onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('opens exercise preview dialog after thumbnail click', async () => {
    const user = userEvent.setup();

    render(
      <ExerciseExecutionCard
        mode="view"
        testIdPrefix="exercise-card"
        exercise={{
          id: 'exercise-preview-1',
          displayName: 'Przysiad',
          sets: 3,
          reps: 10,
          executionTime: 8,
          imageUrls: ['/image-1.jpg', '/image-2.jpg'],
        }}
      />
    );

    await user.click(screen.getByTestId('exercise-card-exercise-preview-1-thumbnail-btn'));

    expect(screen.getByTestId('exercise-preview-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-preview-title')).toHaveTextContent('Przysiad');
  });

  it('pozwala wyczyścić czas powtórzenia i emituje undefined', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ExerciseExecutionCard
        mode="edit"
        defaultExpanded
        testIdPrefix="exercise-card"
        onChange={onChange}
        exercise={{
          id: 'exercise-clear-1',
          displayName: 'Przysiad',
          sets: 3,
          reps: 10,
          executionTime: 1,
        }}
      />
    );

    const executionTimeInput = screen.getByTestId('exercise-card-exercise-clear-1-execution-time-input');
    await user.clear(executionTimeInput);

    expect(onChange).toHaveBeenCalledWith({ executionTime: undefined });
  });
});

