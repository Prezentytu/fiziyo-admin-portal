import { describe, expect, it } from 'vitest';

import { buildMediaItems } from '../mediaItems';

describe('buildMediaItems', () => {
  it('keeps stable order and deduplicates image sources', () => {
    const result = buildMediaItems({
      title: 'Plank bokiem',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      imageUrl: 'https://cdn.example.com/thumb.jpg',
      images: ['https://cdn.example.com/step-1.jpg', 'https://cdn.example.com/step-1.jpg', null],
    });

    expect(result).toEqual([
      {
        kind: 'image',
        src: 'https://cdn.example.com/thumb.jpg',
        title: 'Plank bokiem',
      },
      {
        kind: 'image',
        src: 'https://cdn.example.com/step-1.jpg',
        title: 'Plank bokiem',
      },
    ]);
  });

  it('appends video and gif after images', () => {
    const result = buildMediaItems({
      title: 'Clamshell',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      videoUrl: 'https://vimeo.com/123456789',
      gifUrl: 'https://cdn.example.com/loop.gif',
    });

    expect(result.map((item) => item.kind)).toEqual(['image', 'video', 'gif']);
    expect(result[1]?.src).toBe('https://vimeo.com/123456789');
    expect(result[2]?.src).toBe('https://cdn.example.com/loop.gif');
  });

  it('adds youtube poster for youtube video', () => {
    const result = buildMediaItems({
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });

    expect(result).toEqual([
      {
        kind: 'video',
        src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        poster: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        title: undefined,
      },
    ]);
  });

  it('returns empty array when no media exists', () => {
    expect(buildMediaItems({})).toEqual([]);
  });
});
