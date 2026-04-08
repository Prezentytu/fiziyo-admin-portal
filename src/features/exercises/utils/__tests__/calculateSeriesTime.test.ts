import { describe, expect, it } from 'vitest';
import { calculateSeriesTimeSeconds } from '../calculateSeriesTime';

describe('calculateSeriesTimeSeconds', () => {
  it('returns explicit duration for time-based exercises', () => {
    expect(
      calculateSeriesTimeSeconds({
        duration: 45,
        reps: 10,
        executionTime: 3,
        restReps: 1,
      })
    ).toBe(45);
  });

  it('calculates series time from reps and execution time', () => {
    expect(
      calculateSeriesTimeSeconds({
        reps: 10,
        executionTime: 4,
      })
    ).toBe(40);
  });

  it('includes micro-rest between reps', () => {
    expect(
      calculateSeriesTimeSeconds({
        reps: 8,
        executionTime: 3,
        restReps: 2,
      })
    ).toBe(38);
  });

  it('returns null when there is not enough data', () => {
    expect(calculateSeriesTimeSeconds({ reps: 10, executionTime: null })).toBeNull();
    expect(calculateSeriesTimeSeconds({ reps: null, executionTime: 3 })).toBeNull();
    expect(calculateSeriesTimeSeconds({ reps: 0, executionTime: 3 })).toBeNull();
  });
});
