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
  it('opens and closes exercise details dialog from preview list', async () => {
    const user = userEvent.setup();
    const set = createExerciseSet();

    render(
      <SelectSetStep
        exerciseSets={[set]}
        selectedSet={set}
        onSelectSet={() => {}}
      />
    );

    await user.click(screen.getByTestId('assign-set-preview-exercise-row-mapping-1'));

    expect(screen.getByTestId('assign-set-preview-exercise-details-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('assign-set-preview-exercise-details-title')).toHaveTextContent(
      'Przysiad przy ścianie'
    );

    await user.click(screen.getByTestId('assign-set-preview-exercise-details-close-btn'));

    expect(screen.queryByTestId('assign-set-preview-exercise-details-dialog')).not.toBeInTheDocument();
  });

  it('does not open details when thumbnail is clicked', async () => {
    const user = userEvent.setup();
    const set = createExerciseSet();

    render(
      <SelectSetStep
        exerciseSets={[set]}
        selectedSet={set}
        onSelectSet={() => {}}
      />
    );

    await user.click(screen.getByTestId('assign-set-preview-exercise-mapping-1-thumbnail-btn'));

    expect(screen.queryByTestId('assign-set-preview-exercise-details-dialog')).not.toBeInTheDocument();
  });
});

describe('SelectSetStep gotowce', () => {
  function createGotowiec(): ExerciseSet {
    return {
      id: 'gotowiec-1',
      name: 'Kolano skoczka',
      description: 'Gotowiec FiziYo',
      kind: 'TEMPLATE',
      isTemplate: true,
      templateSource: 'FIZIYO_VERIFIED',
      exerciseMappings: [
        {
          id: 'mapping-g1',
          exerciseId: 'exercise-g1',
          sets: 3,
          reps: 10,
          exercise: { id: 'exercise-g1', name: 'Przysiad' },
        },
      ],
    };
  }

  it('renders FiziyoVerified tiles and clinical case chips', () => {
    render(
      <SelectSetStep
        exerciseSets={[createGotowiec(), createExerciseSet()]}
        selectedSet={null}
        onSelectSet={() => {}}
      />
    );

    expect(screen.getByTestId('set-gotowiec-section')).toBeInTheDocument();
    expect(screen.getByTestId('set-gotowiec-tile-gotowiec-1')).toHaveTextContent('Kolano skoczka');
    expect(screen.getByTestId('set-gotowiec-case-kolano')).toHaveTextContent('Kolano');
  });

  it('calls onSelectGotowiec when a verified tile is clicked', async () => {
    const user = userEvent.setup();
    const onSelectSet = vi.fn();
    const onSelectGotowiec = vi.fn();
    const gotowiec = createGotowiec();

    render(
      <SelectSetStep
        exerciseSets={[gotowiec]}
        selectedSet={null}
        onSelectSet={onSelectSet}
        onSelectGotowiec={onSelectGotowiec}
      />
    );

    await user.click(screen.getByTestId('set-gotowiec-tile-gotowiec-1'));

    expect(onSelectSet).toHaveBeenCalledWith(gotowiec);
    expect(onSelectGotowiec).toHaveBeenCalledWith(gotowiec);
  });

  it('shows empty copy when no FiziyoVerified templates exist', () => {
    render(
      <SelectSetStep exerciseSets={[createExerciseSet()]} selectedSet={null} onSelectSet={() => {}} />
    );

    expect(screen.getByTestId('set-gotowiec-empty')).toHaveTextContent('Brak gotowców FiziYo w katalogu');
  });
});

