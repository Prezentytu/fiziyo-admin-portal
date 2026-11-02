import { describe, expect, it } from 'vitest';

import { formatPendingQueueTitle } from '../queueHero';

describe('formatPendingQueueTitle', () => {
  it.each([
    [1, 'ćwiczenie czeka na Twoją decyzję'],
    [3, 'ćwiczenia czekają na Twoją decyzję'],
    [5, 'ćwiczeń czeka na Twoją decyzję'],
    [12, 'ćwiczeń czeka na Twoją decyzję'],
    [22, 'ćwiczenia czekają na Twoją decyzję'],
  ])('odmienia zdanie dla %i', (count, expected) => {
    expect(formatPendingQueueTitle(count)).toBe(expected);
  });
});
