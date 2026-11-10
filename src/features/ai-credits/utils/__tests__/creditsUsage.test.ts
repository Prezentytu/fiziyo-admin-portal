import { describe, expect, it } from 'vitest';

import { CREDITS_HISTORY_LIMIT, summarizeCreditsUsage } from '../creditsUsage';

const log = (kind: string, actionType: string, creditsUsed: number) => ({ kind, actionType, creditsUsed });

describe('summarizeCreditsUsage', () => {
  it('sumuje zużycie według funkcji, od największego', () => {
    const summary = summarizeCreditsUsage([
      log('usage', 'chat', 1),
      log('usage', 'image_generate', 5),
      log('usage', 'chat', 1),
      log('usage', 'chat', 1),
    ]);

    expect(summary.byFeature).toEqual([
      { key: 'image_generate', label: 'Obrazy ćwiczeń', credits: 5 },
      { key: 'chat', label: 'Czat', credits: 3 },
    ]);
  });

  it('wywołanie rozbite na pulę miesięczną i dodatkową liczy się w sumie raz', () => {
    const summary = summarizeCreditsUsage([log('usage', 'set_generate', 2), log('usage', 'set_generate', 1)]);

    expect(summary.byFeature).toEqual([{ key: 'set_generate', label: 'Zestawy z AI', credits: 3 }]);
  });

  it('zwroty idą osobno, a przyznania i zmiany planu nie są zużyciem', () => {
    const summary = summarizeCreditsUsage([
      log('usage', 'chat', 1),
      log('refund', 'refund', 1),
      log('grant', 'grant', 100),
      log('plan_change', 'plan_change', 0),
    ]);

    expect(summary.byFeature).toEqual([{ key: 'chat', label: 'Czat', credits: 1 }]);
    expect(summary.refunded).toBe(1);
  });

  it('nieznana funkcja z backendu trafia do „Inne”, a nie znika', () => {
    const summary = summarizeCreditsUsage([log('usage', 'new_feature', 2), log('usage', 'toString', 1)]);

    expect(summary.byFeature).toEqual([{ key: 'other', label: 'Inne', credits: 3 }]);
  });

  it('oznacza historię uciętą przez limit backendu', () => {
    expect(summarizeCreditsUsage([log('usage', 'chat', 1)]).truncated).toBe(false);
    const full = Array.from({ length: CREDITS_HISTORY_LIMIT }, () => log('usage', 'chat', 1));
    expect(summarizeCreditsUsage(full).truncated).toBe(true);
  });

  it('pusta historia to brak wierszy', () => {
    expect(summarizeCreditsUsage([])).toEqual({ byFeature: [], refunded: 0, truncated: false });
  });
});
