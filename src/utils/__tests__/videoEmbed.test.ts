import { describe, expect, it } from 'vitest';

import { getYouTubeEmbedUrl } from '../videoEmbed';

function startParam(url: string): string | null {
  const embedUrl = getYouTubeEmbedUrl(url);
  if (!embedUrl) throw new Error(`No embed URL for ${url}`);
  return new URL(embedUrl).searchParams.get('start');
}

describe('getYouTubeEmbedUrl (CAT04)', () => {
  it.each([
    ['https://www.youtube.com/watch?v=7rnlAVhAK-8&t=6s', '6'],
    ['https://www.youtube.com/watch?v=7rnlAVhAK-8&start=6', '6'],
    ['https://youtu.be/7rnlAVhAK-8?t=6', '6'],
    ['https://www.youtube.com/watch?v=7rnlAVhAK-8#t=6s', '6'],
    ['https://www.youtube.com/watch?v=7rnlAVhAK-8&t=1m30s', '90'],
    ['https://www.youtube.com/watch?v=7rnlAVhAK-8&t=1h2m3s', '3723'],
  ])('przenosi czas startu z %s do start=%s', (url, expectedStart) => {
    expect(startParam(url)).toBe(expectedStart);
  });

  it.each([
    'https://www.youtube.com/watch?v=7rnlAVhAK-8',
    'https://www.youtube.com/watch?v=7rnlAVhAK-8&t=0s',
    'https://www.youtube.com/watch?v=7rnlAVhAK-8&t=abc',
  ])('bez poprawnego czasu startu nie dodaje start (%s)', (url) => {
    expect(startParam(url)).toBeNull();
  });

  it('zachowuje ID filmu i dotychczasowe parametry odtwarzacza', () => {
    expect(getYouTubeEmbedUrl('https://www.youtube.com/watch?v=7rnlAVhAK-8&t=6s')).toBe(
      'https://www.youtube.com/embed/7rnlAVhAK-8?playsinline=1&modestbranding=1&rel=0&start=6',
    );
  });
});
