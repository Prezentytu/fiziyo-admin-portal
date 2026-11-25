import { describe, expect, it } from 'vitest';
import { estimateSetSeconds, formatSetDurationDelta, splitSetDuration } from './setDuration';

const mapping = (id: string, sets: number, reps: number) => ({
  id,
  sets,
  reps,
  executionTime: 2,
  restSets: 30,
  restReps: 0,
  preparationTime: 5,
  exercise: { id: `ex-${id}`, name: id, type: 'reps', side: 'none' },
});

describe('estimateSetSeconds', () => {
  it('sums positions and grows when reps go up', () => {
    const base = estimateSetSeconds([mapping('a', 2, 8), mapping('b', 2, 10)]);
    const more = estimateSetSeconds([mapping('a', 2, 9), mapping('b', 2, 10)]);
    expect(base).toBeGreaterThan(0);
    expect(more).toBeGreaterThan(base);
  });

  it('returns 0 for no positions', () => {
    expect(estimateSetSeconds(undefined)).toBe(0);
    expect(estimateSetSeconds([])).toBe(0);
  });
});

describe('splitSetDuration', () => {
  it('splits into minutes and seconds', () => {
    expect(splitSetDuration(440)).toEqual({ minutes: 7, seconds: 20 });
    expect(splitSetDuration(-5)).toEqual({ minutes: 0, seconds: 0 });
    expect(splitSetDuration(Number.NaN)).toEqual({ minutes: 0, seconds: 0 });
  });
});

describe('formatSetDurationDelta', () => {
  it('shows sign and unit', () => {
    expect(formatSetDurationDelta(16)).toBe('+16 s');
    expect(formatSetDurationDelta(-65)).toBe('−1 min 05 s');
    expect(formatSetDurationDelta(120)).toBe('+2 min');
    expect(formatSetDurationDelta(0)).toBe('');
  });
});
