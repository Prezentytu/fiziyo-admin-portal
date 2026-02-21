import { describe, expect, it } from 'vitest';
import { buildExerciseDetailsViewModel } from './exerciseDetailsViewModel';
import type { ExerciseMapping } from './types';

function createMapping(overrides?: Partial<ExerciseMapping>): ExerciseMapping {
  return {
    id: 'mapping-1',
    exerciseId: 'exercise-1',
    sets: 4,
    reps: 12,
    executionTime: 8,
    customName: 'Nazwa custom',
    customDescription: 'Opis custom',
    load: { type: 'weight', value: 12, unit: 'kg', text: '12 kg' },
    exercise: {
      id: 'exercise-1',
      name: 'Przysiad',
      patientDescription: 'Opis pacjenta',
      imageUrl: '/img-a.jpg',
      images: ['/img-a.jpg', '/img-b.jpg'],
      videoUrl: 'https://example.com/video.mp4',
      defaultSets: 3,
      defaultReps: 10,
      defaultExecutionTime: 5,
      defaultRestBetweenSets: 60,
      defaultRestBetweenReps: 10,
      side: 'left',
    },
    ...overrides,
  };
}

describe('buildExerciseDetailsViewModel', () => {
  it('uses custom name and custom description with highest priority', () => {
    const viewModel = buildExerciseDetailsViewModel(createMapping());

    expect(viewModel.displayName).toBe('Nazwa custom');
    expect(viewModel.description).toBe('Opis custom');
  });

  it('falls back to patient description when custom description is missing', () => {
    const viewModel = buildExerciseDetailsViewModel(
      createMapping({ customDescription: undefined, exercise: { id: 'exercise-1', name: 'Przysiad', patientDescription: 'Opis z exercise' } })
    );

    expect(viewModel.description).toBe('Opis z exercise');
  });

  it('returns safe fallback when no descriptions are available', () => {
    const viewModel = buildExerciseDetailsViewModel(
      createMapping({
        customDescription: undefined,
        exercise: { id: 'exercise-1', name: 'Przysiad', patientDescription: undefined, description: undefined },
      })
    );

    expect(viewModel.description).toBe('Brak opisu ćwiczenia.');
  });

  it('uses mapping values before exercise defaults for core parameters', () => {
    const viewModel = buildExerciseDetailsViewModel(
      createMapping({
        sets: 6,
        reps: 15,
        executionTime: 20,
        exercise: {
          id: 'exercise-1',
          name: 'Przysiad',
          defaultSets: 3,
          defaultReps: 10,
          defaultExecutionTime: 5,
        },
      })
    );

    expect(viewModel.sets).toBe(6);
    expect(viewModel.reps).toBe(15);
    expect(viewModel.executionTime).toBe(20);
  });

  it('builds image list without duplicates and resolves video fallback', () => {
    const viewModel = buildExerciseDetailsViewModel(
      createMapping({
        videoUrl: undefined,
        exercise: {
          id: 'exercise-1',
          name: 'Przysiad',
          imageUrl: '/a.jpg',
          images: ['/a.jpg', '/b.jpg', '/a.jpg'],
          videoUrl: 'https://example.com/video-fallback.mp4',
        },
      })
    );

    expect(viewModel.imageUrls).toEqual(['/a.jpg', '/b.jpg']);
    expect(viewModel.videoUrl).toBe('https://example.com/video-fallback.mp4');
  });
});

