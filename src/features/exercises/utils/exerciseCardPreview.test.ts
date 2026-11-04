import { describe, expect, it } from 'vitest';

import { getExerciseCardPreview } from './exerciseCardPreview';

describe('getExerciseCardPreview', () => {
  it('keeps the exercise photo first, even when there is a video', () => {
    const preview = getExerciseCardPreview({
      imageUrl: 'https://cdn.example.com/a.jpg',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });

    expect(preview).toEqual({ imageUrl: 'https://cdn.example.com/a.jpg', hasVideoWithoutFrame: false });
  });

  it('shows a frame of the YouTube video when the exercise has no photo', () => {
    const preview = getExerciseCardPreview({ videoUrl: 'https://youtu.be/dQw4w9WgXcQ' });

    expect(preview.imageUrl).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('marks a Vimeo video without a frame instead of showing "no image"', () => {
    expect(getExerciseCardPreview({ videoUrl: 'https://vimeo.com/123456789' })).toEqual({
      hasVideoWithoutFrame: true,
    });
  });

  it('has nothing to show without photo and video', () => {
    expect(getExerciseCardPreview({})).toEqual({ hasVideoWithoutFrame: false });
  });
});
