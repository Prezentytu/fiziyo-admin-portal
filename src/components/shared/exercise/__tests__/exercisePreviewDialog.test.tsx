import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExercisePreviewDialog } from '../ExercisePreviewDialog';
import type { ExerciseExecutionCardData } from '../types';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt?: string }) => <img src={src} alt={alt ?? ''} />,
}));

function createExercise(overrides?: Partial<ExerciseExecutionCardData>): ExerciseExecutionCardData {
  return {
    id: 'exercise-1',
    displayName: 'Skłon boczny',
    imageUrls: ['/image-1.jpg', '/image-2.jpg'],
    videoUrl: 'https://example.com/video.mp4',
    sets: 3,
    reps: 12,
    executionTime: 8,
    restSets: 45,
    tempo: '3-1-2-0',
    patientDescription: 'Opis dla pacjenta',
    clinicalDescription: 'Opis kliniczny',
    notes: 'Notatka',
    ...overrides,
  };
}

describe('ExercisePreviewDialog', () => {
  it('renders detail sections and supports media navigation', async () => {
    const user = userEvent.setup();

    render(
      <ExercisePreviewDialog
        open
        exercise={createExercise({ videoUrl: undefined })}
        onOpenChange={() => {}}
        testIdPrefix="exercise-preview-test"
      />
    );

    expect(screen.getByTestId('exercise-preview-test-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('exercise-preview-test-title')).toHaveTextContent('Skłon boczny');
    expect(screen.getByTestId('exercise-preview-test-params')).toHaveTextContent('Serie');
    expect(screen.getByTestId('exercise-preview-test-params')).toHaveTextContent('Parametry wykonania');

    await user.click(screen.getByTestId('exercise-preview-test-media-next-btn'));
    await user.click(screen.getByTestId('exercise-preview-test-media-prev-btn'));
  });

  it('renders fallback media placeholder when images and video are missing', () => {
    render(
      <ExercisePreviewDialog
        open
        exercise={createExercise({ imageUrls: [], videoUrl: undefined })}
        onOpenChange={() => {}}
        testIdPrefix="exercise-preview-test"
      />
    );

    expect(screen.getByTestId('exercise-preview-test-media-empty')).toBeInTheDocument();
  });

  it('uses thumbnail fallback when gallery images are missing', () => {
    render(
      <ExercisePreviewDialog
        open
        exercise={createExercise({ imageUrls: [], thumbnailUrl: '/thumb.jpg', videoUrl: undefined })}
        onOpenChange={() => {}}
        testIdPrefix="exercise-preview-test"
      />
    );

    expect(screen.getByTestId('exercise-preview-test-media')).toBeInTheDocument();
    expect(screen.queryByTestId('exercise-preview-test-media-empty')).not.toBeInTheDocument();
  });

  it('includes video in left-right gallery navigation', async () => {
    const user = userEvent.setup();

    render(
      <ExercisePreviewDialog
        open
        exercise={createExercise({ imageUrls: ['/image-1.jpg'], videoUrl: 'https://example.com/video.mp4' })}
        onOpenChange={() => {}}
        testIdPrefix="exercise-preview-test"
      />
    );

    expect(screen.queryByText('Wideo')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('exercise-preview-test-media-next-btn'));
    expect(screen.getByText('Wideo')).toBeInTheDocument();
  });
});
