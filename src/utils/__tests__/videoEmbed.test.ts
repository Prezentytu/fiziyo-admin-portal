import { describe, expect, it } from 'vitest';

import {
  canOpenVideoOutsidePortal,
  extractVideoStartSeconds,
  formatVideoStart,
  getVimeoEmbedUrl,
  getYouTubeEmbedUrl,
  isSameVideoIgnoringStart,
  parseVideoStartInput,
  withVideoStart,
} from '../videoEmbed';

describe('canOpenVideoOutsidePortal', () => {
  it.each([
    ['https://vimeo.com/123456789', false],
    ['https://player.vimeo.com/video/123456789?h=abc', false],
    ['https://www.youtube.com/watch?v=7rnlAVhAK-8', true],
    ['https://cdn.example.com/clip.mp4', true],
    ['', false],
    [null, false],
  ])('dla %s zwraca %s', (url, expected) => {
    expect(canOpenVideoOutsidePortal(url)).toBe(expected);
  });
});

function startParam(url: string): string | null {
  const embedUrl = getYouTubeEmbedUrl(url);
  if (!embedUrl) throw new Error(`No embed URL for ${url}`);
  return new URL(embedUrl).searchParams.get('start');
}

describe('getYouTubeEmbedUrl (CAT04)', () => {
  it.each([
    'https://youtube.com/shorts/4QVKjqOvJc4?is=CqN9pP5gZJfMgxfg',
    'https://www.youtube.com/shorts/4QVKjqOvJc4',
    'https://www.youtube.com/live/4QVKjqOvJc4?si=abc',
  ])('rozpoznaje link Shorts i live (%s)', (url) => {
    expect(getYouTubeEmbedUrl(url)).toBe(
      'https://www.youtube.com/embed/4QVKjqOvJc4?playsinline=1&modestbranding=1&rel=0'
    );
  });

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

describe('video start marker (SPEC-064)', () => {
  it.each([
    ['https://vimeo.com/123456789/abcdef#t=90s', 90],
    ['https://vimeo.com/123456789#t=1m30s', 90],
    ['https://youtu.be/7rnlAVhAK-8?t=1h2m3s', 3723],
    ['https://vimeo.com/123456789#t=0', null],
    ['https://vimeo.com/123456789#t=abc', null],
    ['https://vimeo.com/123456789', null],
  ])('reads the marker from %s', (url, expected) => {
    expect(extractVideoStartSeconds(url)).toBe(expected);
  });

  it('writes the marker in the form each service understands and replaces an old one', () => {
    expect(withVideoStart('https://vimeo.com/123456789/abcdef', 90)).toBe('https://vimeo.com/123456789/abcdef#t=90s');
    expect(withVideoStart('https://vimeo.com/123456789/abcdef#t=10s', 95.7)).toBe(
      'https://vimeo.com/123456789/abcdef#t=95s'
    );
    expect(withVideoStart('https://www.youtube.com/watch?v=7rnlAVhAK-8&t=6s', 90)).toBe(
      'https://www.youtube.com/watch?v=7rnlAVhAK-8&t=90s'
    );
    expect(withVideoStart('https://youtu.be/7rnlAVhAK-8?start=6', null)).toBe('https://youtu.be/7rnlAVhAK-8');
    expect(withVideoStart('https://vimeo.com/123456789#t=90s', null)).toBe('https://vimeo.com/123456789');
    expect(withVideoStart('https://cdn.example.com/clip.mp4', 90)).toBe('https://cdn.example.com/clip.mp4');
  });

  it('treats links that differ only by the marker as the same video', () => {
    expect(isSameVideoIgnoringStart('https://vimeo.com/1#t=90s', 'https://vimeo.com/1')).toBe(true);
    expect(isSameVideoIgnoringStart('https://vimeo.com/1#t=90s', 'https://vimeo.com/2#t=90s')).toBe(false);
  });

  it('carries the Vimeo marker into the player address and turns on the API only when asked', () => {
    expect(getVimeoEmbedUrl('https://vimeo.com/123456789/abcdef#t=1m30s')).toBe(
      'https://player.vimeo.com/video/123456789?title=0&byline=0&portrait=0&autoplay=0&muted=0&controls=1&dnt=1&h=abcdef#t=90s'
    );
    expect(getVimeoEmbedUrl('https://vimeo.com/123456789', { enableApi: true })).toContain('&api=1');
    expect(getYouTubeEmbedUrl('https://youtu.be/7rnlAVhAK-8', { enableApi: true })).toContain('enablejsapi=1');
  });

  it.each([
    ['1:30', 90],
    ['01:02:03', 3723],
    ['90', 90],
    ['1m30s', 90],
    ['', null],
    ['0:00', null],
    ['0', null],
    ['1:75', undefined],
    ['abc', undefined],
  ])('reads the typed start %s', (typed, expected) => {
    expect(parseVideoStartInput(typed)).toBe(expected);
  });

  it('formats the start as m:ss or h:mm:ss', () => {
    expect(formatVideoStart(90)).toBe('1:30');
    expect(formatVideoStart(3723)).toBe('1:02:03');
    expect(formatVideoStart(5)).toBe('0:05');
  });
});
