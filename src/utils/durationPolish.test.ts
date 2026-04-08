import { describe, expect, it } from 'vitest';
import { formatDurationPolish } from './durationPolish';

describe('formatDurationPolish', () => {
  it('formatuje 45 sekund', () => {
    expect(formatDurationPolish(45)).toBe('45 sekund');
  });

  it('formatuje 60 sekund', () => {
    expect(formatDurationPolish(60)).toBe('1 minuta');
  });

  it('formatuje 75 sekund', () => {
    expect(formatDurationPolish(75)).toBe('1 minuta 15 sekund');
  });

  it('formatuje 300 sekund', () => {
    expect(formatDurationPolish(300)).toBe('5 minut');
  });
});
