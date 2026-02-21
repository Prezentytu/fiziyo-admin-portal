import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ExerciseDetailsDialog } from './ExerciseDetailsDialog';
import type { ExerciseMapping } from './types';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

function createMapping(overrides?: Partial<ExerciseMapping>): ExerciseMapping {
  return {
    id: 'mapping-1',
    exerciseId: 'exercise-1',
    sets: 3,
    reps: 10,
    executionTime: 6,
    customName: 'Skłon boczny',
    customDescription: 'Opis dla pacjenta z customizacji',
    notes: 'Oddychaj spokojnie',
    exercise: {
      id: 'exercise-1',
      name: 'Skłon boczny bazowy',
      patientDescription: 'Opis bazowy',
      imageUrl: '/image-1.jpg',
      images: ['/image-1.jpg', '/image-2.jpg'],
      videoUrl: 'https://example.com/video.mp4',
      side: 'right',
    },
    ...overrides,
  };
}

describe('ExerciseDetailsDialog', () => {
  it('renders title, description and params for complete mapping data', () => {
    render(
      <ExerciseDetailsDialog open mapping={createMapping()} onOpenChange={() => {}} />
    );

    expect(screen.getByTestId('assign-set-preview-exercise-details-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('assign-set-preview-exercise-details-title')).toHaveTextContent('Skłon boczny');
    expect(screen.getByTestId('assign-set-preview-exercise-details-description')).toHaveTextContent(
      'Opis dla pacjenta z customizacji'
    );
    expect(screen.getByTestId('assign-set-preview-exercise-details-params')).toHaveTextContent('3 serie');
    expect(screen.getByTestId('assign-set-preview-exercise-details-video')).toBeInTheDocument();
  });

  it('shows fallback description when mapping does not provide descriptions', () => {
    render(
      <ExerciseDetailsDialog
        open
        mapping={createMapping({
          customDescription: undefined,
          exercise: {
            id: 'exercise-1',
            name: 'Skłon boczny bazowy',
            patientDescription: undefined,
            description: undefined,
          },
        })}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByTestId('assign-set-preview-exercise-details-description')).toHaveTextContent(
      'Brak opisu ćwiczenia.'
    );
  });

  it('calls onOpenChange(false) when close button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ExerciseDetailsDialog open mapping={createMapping()} onOpenChange={onOpenChange} />
    );

    await user.click(screen.getByTestId('assign-set-preview-exercise-details-close-btn'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

