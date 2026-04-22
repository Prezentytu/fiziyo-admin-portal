import { describe, expect, it } from 'vitest';
import { resolveExerciseImageUrl } from '../pdfImageResolver';

describe('resolveExerciseImageUrl', () => {
  it('returns undefined when exercise is undefined', () => {
    expect(resolveExerciseImageUrl(undefined)).toBeUndefined();
  });

  it('returns undefined when exercise is null', () => {
    expect(resolveExerciseImageUrl(null)).toBeUndefined();
  });

  it('prefers thumbnailUrl over imageUrl and images[0]', () => {
    const result = resolveExerciseImageUrl({
      thumbnailUrl: 'thumb.jpg',
      imageUrl: 'image.jpg',
      images: ['gallery0.jpg'],
    });
    expect(result).toBe('thumb.jpg');
  });

  it('falls back to imageUrl when thumbnailUrl is missing', () => {
    const result = resolveExerciseImageUrl({
      imageUrl: 'image.jpg',
      images: ['gallery0.jpg'],
    });
    expect(result).toBe('image.jpg');
  });

  it('falls back to images[0] when thumbnailUrl and imageUrl are missing', () => {
    const result = resolveExerciseImageUrl({
      images: ['gallery0.jpg', 'gallery1.jpg'],
    });
    expect(result).toBe('gallery0.jpg');
  });

  it('returns undefined when no source has a value', () => {
    const result = resolveExerciseImageUrl({ images: [] });
    expect(result).toBeUndefined();
  });

  it('skips empty strings in the chain', () => {
    const result = resolveExerciseImageUrl({
      thumbnailUrl: '',
      imageUrl: '',
      images: ['gallery0.jpg'],
    });
    expect(result).toBe('gallery0.jpg');
  });
});
