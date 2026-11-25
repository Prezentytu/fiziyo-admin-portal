import { describe, expect, it } from 'vitest';

import { daysUntilPurge, purgeLabel } from '../trashRetention';

const NOW = new Date('2026-11-25T12:00:00Z');

describe('daysUntilPurge', () => {
  it('rounds a partial day up so the item is not shown as due too early', () => {
    expect(daysUntilPurge('2026-11-28T08:00:00Z', NOW)).toBe(3);
  });

  it('returns 0 when the purge time has passed', () => {
    expect(daysUntilPurge('2026-11-25T11:59:59Z', NOW)).toBe(0);
  });
});

describe('purgeLabel', () => {
  it.each([
    ['2026-11-25T11:00:00Z', 'Usunie się dziś'],
    ['2026-11-26T11:00:00Z', 'Usunie się jutro'],
    ['2026-12-25T12:00:00Z', 'Usunie się za 30 dni'],
  ])('%s → %s', (purgeAt, label) => {
    expect(purgeLabel(purgeAt, NOW)).toBe(label);
  });
});
