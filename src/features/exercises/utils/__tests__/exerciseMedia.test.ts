import { describe, expect, it } from 'vitest';

import { buildExerciseMediaChangeSet, getExerciseMediaGalleryUrls } from '../exerciseMedia';

describe('getExerciseMediaGalleryUrls', () => {
  it('returns thumbnail fallback when only thumbnail exists', () => {
    const result = getExerciseMediaGalleryUrls({
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      imageUrl: null,
      images: [],
    });

    expect(result).toEqual(['https://cdn.example.com/thumb.jpg']);
  });

  it('returns deduplicated gallery with stable order', () => {
    const result = getExerciseMediaGalleryUrls({
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      imageUrl: 'https://cdn.example.com/thumb.jpg',
      images: ['https://cdn.example.com/alt-1.jpg', 'https://cdn.example.com/alt-1.jpg', null],
    });

    expect(result).toEqual(['https://cdn.example.com/thumb.jpg', 'https://cdn.example.com/alt-1.jpg']);
  });
});

describe('buildExerciseMediaChangeSet', () => {
  it('marks removed URLs and preserves files to upload', () => {
    const initialExistingUrls = ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg'];
    const keptExistingUrls = ['https://cdn.example.com/b.jpg'];
    const newFiles = [new File(['x'], 'new-a.jpg', { type: 'image/jpeg' })];

    const result = buildExerciseMediaChangeSet({
      initialExistingUrls,
      keptExistingUrls,
      newFiles,
    });

    expect(result.removedImageUrls).toEqual(['https://cdn.example.com/a.jpg']);
    expect(result.filesToUpload).toHaveLength(1);
    expect(result.filesToUpload[0]?.name).toBe('new-a.jpg');
  });

  it('does not mark removals when all existing URLs are kept', () => {
    const initialExistingUrls = ['https://cdn.example.com/a.jpg'];
    const keptExistingUrls = ['https://cdn.example.com/a.jpg'];

    const result = buildExerciseMediaChangeSet({
      initialExistingUrls,
      keptExistingUrls,
      newFiles: [],
    });

    expect(result.removedImageUrls).toEqual([]);
    expect(result.filesToUpload).toEqual([]);
  });
});
