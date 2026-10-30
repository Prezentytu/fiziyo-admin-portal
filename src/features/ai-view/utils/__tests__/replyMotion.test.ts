import { describe, expect, it } from 'vitest';

import { revealSegments, thinkingLabel } from '../replyMotion';

describe('revealSegments', () => {
  it('keeps the whole text, word by word, with growing delays', () => {
    const segments = revealSegments('Gotowe, plan wysłany.\nCoś jeszcze?');

    expect(segments.map((segment) => segment.text).join('')).toBe('Gotowe, plan wysłany.\nCoś jeszcze?');
    expect(segments.map((segment) => segment.delayMs)).toEqual([0, 18, 36, 54, 72]);
  });

  it('lands a long reply within the reveal budget', () => {
    const segments = revealSegments(Array.from({ length: 200 }, (_, index) => `słowo${index}`).join(' '));

    expect(segments).toHaveLength(200);
    expect(segments.at(-1)?.delayMs).toBeLessThanOrEqual(700);
  });

  it('returns nothing for an empty reply', () => {
    expect(revealSegments('')).toEqual([]);
  });
});

describe('thinkingLabel', () => {
  it('moves the status on as the wait grows', () => {
    expect(thinkingLabel(0)).toBe('Czytam, o co chodzi…');
    expect(thinkingLabel(1500)).toBe('Sprawdzam pacjentów i katalog…');
    expect(thinkingLabel(5000)).toBe('Układam odpowiedź…');
    expect(thinkingLabel(20000)).toBe('Jeszcze chwila, to dłuższe zadanie…');
  });

  it('speaks about the document while one is read', () => {
    expect(thinkingLabel(0, true)).toBe('Czytam dokument…');
    expect(thinkingLabel(3000, true)).toBe('Wyłuskuję zalecenia…');
  });
});
