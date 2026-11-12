import { describe, expect, it } from 'vitest';

import {
  appendQueueOrderingParams,
  DEFAULT_QUEUE_ORDERING,
  isDefaultQueueOrdering,
  parseQueueDay,
  parseQueueOrdering,
  queueDateLabel,
  queueOrderingVariables,
} from '../queueOrdering';

describe('queueOrderingVariables', () => {
  it('domyślne sortowanie i brak dat nie wysyła nowych argumentów (zgodność ze starym API)', () => {
    expect(queueOrderingVariables(DEFAULT_QUEUE_ORDERING)).toEqual({});
  });

  it('zakres dni w strefie użytkownika zamienia na [północ od, północ dnia po do) w UTC', () => {
    // Oczekiwania liczone w strefie procesu testów, tak jak przeglądarka liczy w strefie użytkownika.
    const variables = queueOrderingVariables({ sort: 'OLDEST', dateFrom: '2026-11-01', dateTo: '2026-11-03' });

    expect(variables).toEqual({
      sort: 'OLDEST',
      dateFrom: new Date(2026, 10, 1).toISOString(),
      dateTo: new Date(2026, 10, 4).toISOString(),
    });
  });

  it('jeden dzień (od = do) obejmuje całą dobę', () => {
    const { dateFrom, dateTo } = queueOrderingVariables({ sort: 'NEWEST', dateFrom: '2026-11-12', dateTo: '2026-11-12' });

    expect(new Date(dateTo!).getTime() - new Date(dateFrom!).getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('ostatni dzień miesiąca przechodzi na pierwszy dzień następnego', () => {
    expect(queueOrderingVariables({ sort: 'NEWEST', dateFrom: '', dateTo: '2026-12-31' }).dateTo).toBe(
      new Date(2027, 0, 1).toISOString()
    );
  });
});

describe('parametry URL', () => {
  it('odczyt odrzuca śmieci i nieistniejące daty', () => {
    const ordering = parseQueueOrdering(new URLSearchParams('sort=bogus&from=2026-02-30&to=jutro'));

    expect(ordering).toEqual(DEFAULT_QUEUE_ORDERING);
    expect(parseQueueDay('2026-02-28')).toBe('2026-02-28');
  });

  it('zapis dopisuje tylko wartości inne niż domyślne, a odczyt je odtwarza', () => {
    const ordering = { sort: 'OLDEST' as const, dateFrom: '2026-11-01', dateTo: '' };

    const params = appendQueueOrderingParams(new URLSearchParams('filter=pending'), ordering);

    expect(params.toString()).toBe('filter=pending&sort=oldest&from=2026-11-01');
    expect(parseQueueOrdering(params)).toEqual(ordering);
    expect(appendQueueOrderingParams(new URLSearchParams('filter=pending'), DEFAULT_QUEUE_ORDERING).toString()).toBe(
      'filter=pending'
    );
  });

  it('isDefaultQueueOrdering', () => {
    expect(isDefaultQueueOrdering(DEFAULT_QUEUE_ORDERING)).toBe(true);
    expect(isDefaultQueueOrdering({ sort: 'NEWEST', dateFrom: '2026-11-01', dateTo: '' })).toBe(false);
  });
});

describe('queueDateLabel', () => {
  it('nazywa tę samą datę, po której backend sortuje kolejkę', () => {
    expect(queueDateLabel('global', 'pending')).toBe('Data dodania');
    expect(queueDateLabel('global', 'changes')).toBe('Data zmiany');
    expect(queueDateLabel('organization', 'pending')).toBe('Data zgłoszenia');
    expect(queueDateLabel('organization', 'verified')).toBe('Data oceny');
    expect(queueDateLabel('organization', 'archived')).toBe('Data zmiany');
  });
});
