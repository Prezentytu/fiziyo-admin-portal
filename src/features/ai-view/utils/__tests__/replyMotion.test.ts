import { describe, expect, it } from 'vitest';

import { nextRevealMarker, revealSegments, thinkingLabel, thinkingTopic } from '../replyMotion';

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

describe('thinkingTopic', () => {
  it('reads the topic of the question, so an exercise question does not check patients', () => {
    expect(thinkingTopic('Znajdź ćwiczenia na rozciąganie barku')).toBe('exercises');
    expect(thinkingTopic('Pokaż ćwiczenia wzmacniające kolano')).toBe('exercises');
    expect(thinkingTopic('Kto nie ćwiczy?')).toBe('patients');
    expect(thinkingTopic('Dodaj nowego pacjenta')).toBe('patients');
    expect(thinkingTopic('Zrób zestaw ćwiczeń na kręgosłup')).toBe('set');
    expect(thinkingTopic('Przypisz plan pacjentce Annie')).toBe('set');
    expect(thinkingTopic('Co potrafisz?')).toBe('general');
    expect(thinkingTopic(undefined)).toBe('general');
  });

  it('treats an attached file as a document, whatever the text says', () => {
    expect(thinkingTopic('Kto nie ćwiczy?', true)).toBe('document');
  });
});

describe('thinkingLabel', () => {
  it('moves the status on as the wait grows, in the words of the topic', () => {
    expect(thinkingLabel(0, 'exercises')).toBe('Czytam pytanie…');
    expect(thinkingLabel(1500, 'exercises')).toBe('Przeglądam katalog ćwiczeń…');
    expect(thinkingLabel(5000, 'exercises')).toBe('Dobieram ćwiczenia…');
    expect(thinkingLabel(1500, 'patients')).toBe('Sprawdzam pacjentów…');
    expect(thinkingLabel(20000, 'set')).toBe('Jeszcze chwila, to dłuższe zadanie…');
  });

  it('never mentions patients for a general question', () => {
    for (const ms of [0, 1500, 5000, 20000]) expect(thinkingLabel(ms)).not.toMatch(/pacjent/);
  });

  it('speaks about the document while one is read', () => {
    expect(thinkingLabel(0, 'document')).toBe('Czytam dokument…');
    expect(thinkingLabel(3000, 'document')).toBe('Wyłuskuję zalecenia…');
  });
});

describe('nextRevealMarker', () => {
  it('keeps the marker while the same conversation stays open', () => {
    const marker = { conversationId: 'c1', since: 100 };
    expect(nextRevealMarker(marker, 'c1', 500)).toBe(marker);
  });

  it('moves the marker when another conversation opens, so its saved replies do not animate', () => {
    const marker = nextRevealMarker({ conversationId: 'c1', since: 100 }, 'c2', 500);
    const savedReplyCreatedAt = 300;

    expect(marker).toEqual({ conversationId: 'c2', since: 500 });
    expect(savedReplyCreatedAt > marker.since).toBe(false);
  });
});
