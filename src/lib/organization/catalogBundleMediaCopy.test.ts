import { describe, expect, it } from 'vitest';

import {
  mediaCopyOutcomeLabel,
  readMediaCopy,
  summarizeMediaCopy,
  type ExerciseBundleMediaCopy,
} from './catalogBundleMediaCopy';

const EMPTY: ExerciseBundleMediaCopy = {
  copied: 0,
  alreadyPresent: 0,
  planned: 0,
  kept: 0,
  failed: 0,
  deferred: 0,
  notCopied: 0,
  items: [],
};

describe('summarizeMediaCopy', () => {
  it('zwraca null, gdy import nie dotknął mediów', () => {
    expect(summarizeMediaCopy(EMPTY)).toBeNull();
    expect(summarizeMediaCopy(null)).toBeNull();
    expect(summarizeMediaCopy(undefined)).toBeNull();
  });

  it('pokazuje tylko niezerowe liczniki w stałej kolejności i wyciąga nieudane adresy', () => {
    const summary = summarizeMediaCopy({
      copied: 2,
      alreadyPresent: 0,
      planned: 0,
      kept: 1,
      failed: 1,
      deferred: 0,
      notCopied: 0,
      items: [
        { sourceUrl: 'https://dev/a.jpg', targetUrl: 'https://prod/a.jpg', outcome: 'COPIED', reason: null },
        { sourceUrl: 'https://dev/b.jpg', targetUrl: 'https://prod/b.jpg', outcome: 'COPIED', reason: null },
        { sourceUrl: 'https://vimeo.com/1', targetUrl: null, outcome: 'KEPT_EMBEDDED', reason: null },
        { sourceUrl: 'https://x.pl/c.gif', targetUrl: null, outcome: 'FAILED', reason: 'HTTP 404' },
      ],
    });

    expect(summary?.counts.map((entry) => [entry.key, entry.count])).toEqual([
      ['copied', 2],
      ['kept', 1],
      ['failed', 1],
    ]);
    expect(summary?.failedItems).toEqual([
      { sourceUrl: 'https://x.pl/c.gif', targetUrl: null, outcome: 'FAILED', reason: 'HTTP 404' },
    ]);
    expect(summary?.totalUrls).toBe(4);
  });

  it('próba na sucho raportuje adresy do skopiowania', () => {
    const summary = summarizeMediaCopy({
      ...EMPTY,
      planned: 1,
      items: [{ sourceUrl: 'https://dev/a.jpg', targetUrl: 'https://prod/a.jpg', outcome: 'PLANNED', reason: null }],
    });

    expect(summary?.counts).toEqual([{ key: 'planned', label: 'do skopiowania', tone: 'warning', count: 1 }]);
    expect(summary?.failedItems).toEqual([]);
  });
});

describe('odłożone i niekopiowane (fizjo-app#432 @ 45ef69a3)', () => {
  const report = {
    copied: 1,
    alreadyPresent: 0,
    planned: 0,
    kept: 0,
    failed: 0,
    deferred: 2,
    notCopied: 1,
    items: [
      { sourceUrl: 'https://dev/a.jpg', targetUrl: 'https://prod/a.jpg', outcome: 'COPIED', reason: null },
      {
        sourceUrl: 'https://dev/b.mp4',
        targetUrl: null,
        outcome: 'DEFERRED',
        reason: 'Limit kopii mediów na jedno żądanie',
      },
      {
        sourceUrl: 'https://dev/c.mp4',
        targetUrl: null,
        outcome: 'DEFERRED',
        reason: 'Limit kopii mediów na jedno żądanie',
      },
      {
        sourceUrl: 'https://dev/d.jpg',
        targetUrl: null,
        outcome: 'NOT_COPIED',
        reason: 'Pozycja z tym adresem jest odrzucona',
      },
    ],
  };

  it('liczniki odłożonych i niekopiowanych są w podsumowaniu i zgadzają się z liczbą adresów', () => {
    const summary = summarizeMediaCopy(readMediaCopy(report));

    expect(summary?.counts.map((entry) => [entry.key, entry.label, entry.count])).toEqual([
      ['copied', 'skopiowane', 1],
      ['deferred', 'odłożone', 2],
      ['notCopied', 'niekopiowane', 1],
    ]);
    expect(summary?.counts.reduce((sum, entry) => sum + entry.count, 0)).toBe(summary?.totalUrls);
  });

  it('wynik pozycji ma polski opis, a nie surową nazwę', () => {
    expect(mediaCopyOutcomeLabel('DEFERRED')).not.toBe('DEFERRED');
    expect(mediaCopyOutcomeLabel('NOT_COPIED')).not.toBe('NOT_COPIED');
    expect(mediaCopyOutcomeLabel('DEFERRED')).toMatch(/wyślij/i);
  });

  it('brakujące liczniki liczy z listy, także dla nowych wyników', () => {
    const read = readMediaCopy({ items: report.items });

    expect(read).toMatchObject({ copied: 1, deferred: 2, notCopied: 1 });
  });

  it('odpowiedź sprzed tych pól (bez deferred i notCopied) daje ekran jak dotąd', () => {
    const read = readMediaCopy({
      copied: 1,
      alreadyPresent: 0,
      planned: 0,
      kept: 0,
      failed: 0,
      items: [report.items[0]],
    });
    const summary = summarizeMediaCopy(read);

    expect(read).toMatchObject({ deferred: 0, notCopied: 0 });
    expect(summary?.counts.map((entry) => entry.key)).toEqual(['copied']);
  });
});

describe('mediaCopyOutcomeLabel', () => {
  it('odróżnia magazyn środowiska od filmu osadzanego', () => {
    expect(mediaCopyOutcomeLabel('KEPT_OWN')).not.toBe(mediaCopyOutcomeLabel('KEPT_EMBEDDED'));
  });
});

describe('readMediaCopy', () => {
  it('czyta raport w kształcie z fizjo-app#432', () => {
    const report = {
      __typename: 'ExerciseBundleMediaCopyDto',
      copied: 1,
      alreadyPresent: 0,
      planned: 0,
      kept: 1,
      failed: 0,
      deferred: 0,
      notCopied: 0,
      items: [
        {
          __typename: 'ExerciseBundleMediaCopyItemDto',
          sourceUrl: 'https://dev/a.jpg',
          targetUrl: 'https://prod/a.jpg',
          outcome: 'COPIED',
          reason: null,
        },
        { sourceUrl: 'https://vimeo.com/1', targetUrl: null, outcome: 'KEPT_EMBEDDED', reason: null },
      ],
    };

    expect(readMediaCopy(report)).toEqual({
      copied: 1,
      alreadyPresent: 0,
      planned: 0,
      kept: 1,
      failed: 0,
      deferred: 0,
      notCopied: 0,
      items: [
        { sourceUrl: 'https://dev/a.jpg', targetUrl: 'https://prod/a.jpg', outcome: 'COPIED', reason: null },
        { sourceUrl: 'https://vimeo.com/1', targetUrl: null, outcome: 'KEPT_EMBEDDED', reason: null },
      ],
    });
  });

  it.each([undefined, null, 'tekst', 7, []])('brak raportu (%s) to null, a podsumowanie znika', (value) => {
    expect(readMediaCopy(value)).toBeNull();
    expect(summarizeMediaCopy(readMediaCopy(value))).toBeNull();
  });

  it('raport bez listy albo z listą innego typu nie ma adresów', () => {
    expect(readMediaCopy({ copied: 2 })?.items).toEqual([]);
    expect(readMediaCopy({ copied: 2, items: 'brak' })?.items).toEqual([]);
    expect(summarizeMediaCopy(readMediaCopy({ copied: 2 }))).toBeNull();
  });

  it('brakujące liczniki liczy z listy adresów', () => {
    const report = readMediaCopy({
      items: [
        { sourceUrl: 'https://dev/a.jpg', outcome: 'COPIED' },
        { sourceUrl: 'https://dev/b.jpg', outcome: 'KEPT_OWN' },
        { sourceUrl: 'https://vimeo.com/1', outcome: 'KEPT_EMBEDDED' },
        { sourceUrl: 'https://x.pl/c.gif', outcome: 'FAILED', reason: 'HTTP 404' },
      ],
    });

    expect(report).toMatchObject({ copied: 1, alreadyPresent: 0, planned: 0, kept: 2, failed: 1 });
    expect(report?.items[0]).toEqual({
      sourceUrl: 'https://dev/a.jpg',
      targetUrl: null,
      outcome: 'COPIED',
      reason: null,
    });
  });

  it('nieznane pola i nieznany wynik nie psują raportu', () => {
    const report = readMediaCopy({
      copied: 1,
      alreadyPresent: 0,
      planned: 0,
      kept: 0,
      failed: 0,
      quarantined: 1,
      bytesCopied: 2048,
      items: [
        {
          sourceUrl: 'https://dev/a.jpg',
          targetUrl: 'https://prod/a.jpg',
          outcome: 'COPIED',
          reason: null,
          bytes: 2048,
        },
        { sourceUrl: 'https://dev/b.mp4', targetUrl: null, outcome: 'QUARANTINED', reason: 'licencja', attempt: 2 },
      ],
    });
    const summary = summarizeMediaCopy(report);

    expect(summary?.totalUrls).toBe(2);
    expect(summary?.counts.map((entry) => [entry.key, entry.count])).toEqual([['copied', 1]]);
    expect(summary?.failedItems).toEqual([]);
    expect(mediaCopyOutcomeLabel('QUARANTINED')).toBe('QUARANTINED');
    expect(report?.items[1]).toEqual({
      sourceUrl: 'https://dev/b.mp4',
      targetUrl: null,
      outcome: 'QUARANTINED',
      reason: 'licencja',
    });
  });

  it('pomija wpis bez adresu albo bez wyniku i licznik o złym typie', () => {
    const report = readMediaCopy({
      copied: '3',
      failed: -1,
      items: [
        null,
        'x',
        { outcome: 'COPIED' },
        { sourceUrl: 'https://dev/a.jpg' },
        { sourceUrl: 'https://dev/b.jpg', outcome: 'COPIED' },
      ],
    });

    expect(report?.items).toEqual([
      { sourceUrl: 'https://dev/b.jpg', targetUrl: null, outcome: 'COPIED', reason: null },
    ]);
    expect(report?.copied).toBe(1);
    expect(report?.failed).toBe(0);
  });

  it('nazwa wyniku spoza słownika nie sięga po właściwości obiektu', () => {
    expect(mediaCopyOutcomeLabel('constructor')).toBe('constructor');
    expect(readMediaCopy({ items: [{ sourceUrl: 'https://dev/a.jpg', outcome: 'toString' }] })?.copied).toBe(0);
  });
});
