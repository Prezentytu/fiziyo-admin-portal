import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '../dateUtils';

const now = new Date('2026-10-09T12:00:00Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

describe('formatRelativeTime', () => {
  it('returns empty string for missing value', () => {
    expect(formatRelativeTime(undefined, now)).toBe('');
    expect(formatRelativeTime('', now)).toBe('');
  });

  it.each([
    [0.5, 'przed chwilą'],
    [3, '3 godz. temu'],
    [30, 'wczoraj'],
    [4 * 24, '4 dni temu'],
    [15 * 24, '2 tyg. temu'],
  ])('formats %s hours ago as %s', (hours, expected) => {
    expect(formatRelativeTime(hoursAgo(hours), now)).toBe(expected);
  });

  it('accepts ISO strings', () => {
    expect(formatRelativeTime(hoursAgo(5).toISOString(), now)).toBe('5 godz. temu');
  });
});
