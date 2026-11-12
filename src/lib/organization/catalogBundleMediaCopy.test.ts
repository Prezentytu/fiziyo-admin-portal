import { describe, expect, it } from 'vitest';

import {
  mediaCopyOutcomeLabel,
  readMediaCopy,
  summarizeMediaCopy,
  type ExerciseBundleMediaCopy,
} from './catalogBundleMediaCopy';

const EMPTY: ExerciseBundleMediaCopy = { copied: 0, alreadyPresent: 0, planned: 0, kept: 0, failed: 0, items: [] };

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
    expect(report?.items[0]).toEqual({ sourceUrl: 'https://dev/a.jpg', targetUrl: null, outcome: 'COPIED', reason: null });
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
        { sourceUrl: 'https://dev/a.jpg', targetUrl: 'https://prod/a.jpg', outcome: 'COPIED', reason: null, bytes: 2048 },
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
      items: [null, 'x', { outcome: 'COPIED' }, { sourceUrl: 'https://dev/a.jpg' }, { sourceUrl: 'https://dev/b.jpg', outcome: 'COPIED' }],
    });

    expect(report?.items).toEqual([{ sourceUrl: 'https://dev/b.jpg', targetUrl: null, outcome: 'COPIED', reason: null }]);
    expect(report?.copied).toBe(1);
    expect(report?.failed).toBe(0);
  });

  it('nazwa wyniku spoza słownika nie sięga po właściwości obiektu', () => {
    expect(mediaCopyOutcomeLabel('constructor')).toBe('constructor');
    expect(readMediaCopy({ items: [{ sourceUrl: 'https://dev/a.jpg', outcome: 'toString' }] })?.copied).toBe(0);
  });
});
