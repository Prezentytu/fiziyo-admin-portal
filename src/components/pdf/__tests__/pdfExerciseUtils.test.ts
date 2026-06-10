import { describe, expect, it, vi } from 'vitest';
import { preloadPdfExerciseImages, resolvePdfExerciseImageUrl } from '../pdfExerciseUtils';

vi.mock('../pdfImagePreloader', () => ({
  preloadPdfImages: vi.fn(),
}));

import { preloadPdfImages } from '../pdfImagePreloader';

const preloadPdfImagesMock = vi.mocked(preloadPdfImages);

describe('resolvePdfExerciseImageUrl', () => {
  it('uses thumbnail first, then imageUrl, then images[0]', () => {
    expect(
      resolvePdfExerciseImageUrl({
        thumbnailUrl: 'thumb.jpg',
        imageUrl: 'img.jpg',
        images: ['img1.jpg'],
      })
    ).toBe('thumb.jpg');

    expect(
      resolvePdfExerciseImageUrl({
        imageUrl: 'img.jpg',
        images: ['img1.jpg'],
      })
    ).toBe('img.jpg');

    expect(
      resolvePdfExerciseImageUrl({
        images: ['img1.jpg'],
      })
    ).toBe('img1.jpg');
  });
});

describe('preloadPdfExerciseImages', () => {
  it('rewrites image urls to preloaded data urls and reports stats', async () => {
    preloadPdfImagesMock.mockResolvedValue(
      new Map([
        ['https://cdn/image-a.jpg', 'data:image/jpeg;base64,AAA'],
        ['https://cdn/image-b.jpg', null],
      ])
    );

    const exercises = [
      { id: '1', name: 'A', imageUrl: 'https://cdn/image-a.jpg' },
      { id: '2', name: 'B', imageUrl: 'https://cdn/image-b.jpg' },
    ];

    const stats = await preloadPdfExerciseImages(exercises);

    expect(preloadPdfImagesMock).toHaveBeenCalledWith(['https://cdn/image-a.jpg', 'https://cdn/image-b.jpg']);
    expect(stats).toEqual({ total: 2, loaded: 1 });
    expect(exercises[0].imageUrl).toBe('data:image/jpeg;base64,AAA');
    expect(exercises[1].imageUrl).toBeUndefined();
  });
});
