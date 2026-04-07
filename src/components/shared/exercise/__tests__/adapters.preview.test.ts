import { describe, expect, it } from 'vitest';

import { buildExerciseImageUrls, fromBuilderExercise, fromExerciseMapping } from '../adapters';
import type { ExerciseMapping } from '@/features/assignment/types';

describe('exercise preview adapters', () => {
  it('maps builder exercise to preview-friendly data with video', () => {
    const result = fromBuilderExercise(
      {
        id: 'exercise-1',
        name: 'Mostek',
        imageUrl: '/image-1.jpg',
        images: ['/image-1.jpg', '/image-2.jpg'],
        videoUrl: 'https://example.com/video.mp4',
        defaultSets: 3,
        defaultReps: 10,
      },
      {
        sets: 4,
        reps: 12,
      }
    );

    expect(result.displayName).toBe('Mostek');
    expect(result.videoUrl).toBe('https://example.com/video.mp4');
    expect(result.imageUrls).toEqual(['/image-1.jpg', '/image-2.jpg']);
    expect(result.sets).toBe(4);
    expect(result.reps).toBe(12);
  });

  it('maps assignment mapping to preview-friendly data with mapping-level video', () => {
    const mapping: ExerciseMapping = {
      id: 'mapping-1',
      exerciseId: 'exercise-1',
      sets: 3,
      reps: 10,
      videoUrl: 'https://example.com/mapping-video.mp4',
      exercise: {
        id: 'exercise-1',
        name: 'Skłon',
        imageUrl: '/image-1.jpg',
        images: ['/image-1.jpg', '/image-2.jpg'],
        videoUrl: 'https://example.com/exercise-video.mp4',
      },
    };

    const result = fromExerciseMapping(mapping);

    expect(result.videoUrl).toBe('https://example.com/mapping-video.mp4');
    expect(result.imageUrls).toEqual(['/image-1.jpg', '/image-2.jpg']);
  });

  it('normalizes gallery images from object and JSON string formats', () => {
    const fromObjects = buildExerciseImageUrls({
      thumbnailUrl: '/thumb.jpg',
      images: [{ url: '/image-1.jpg' }, { imageUrl: '/image-2.jpg' }],
    });
    expect(fromObjects).toEqual(['/thumb.jpg', '/image-1.jpg', '/image-2.jpg']);

    const fromJsonString = buildExerciseImageUrls({
      images: JSON.stringify([{ url: '/image-3.jpg' }, { src: '/image-4.jpg' }]),
    });
    expect(fromJsonString).toEqual(['/image-3.jpg', '/image-4.jpg']);
  });
});
