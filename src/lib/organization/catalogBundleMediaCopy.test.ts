import { describe, expect, it } from 'vitest';

import type { ExerciseBundleMediaCopy } from '@/graphql/mutations/exercises.mutations';

import { mediaCopyOutcomeLabel, summarizeMediaCopy } from './catalogBundleMediaCopy';

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
