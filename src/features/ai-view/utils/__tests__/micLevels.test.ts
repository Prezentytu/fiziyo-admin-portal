import { describe, expect, it } from 'vitest';

import { pushLevel, rmsLevel, WAVE_BARS } from '../micLevels';

describe('rmsLevel', () => {
  it('is zero for silence and grows with loudness, capped at one', () => {
    expect(rmsLevel(new Uint8Array(64).fill(128))).toBe(0);
    const quiet = rmsLevel(Uint8Array.from({ length: 64 }, (_, index) => (index % 2 ? 136 : 120)));
    const loud = rmsLevel(Uint8Array.from({ length: 64 }, (_, index) => (index % 2 ? 200 : 56)));
    expect(quiet).toBeGreaterThan(0);
    expect(loud).toBeGreaterThan(quiet);
    expect(rmsLevel(Uint8Array.from({ length: 64 }, (_, index) => (index % 2 ? 255 : 0)))).toBe(1);
  });

  it('returns zero for no samples', () => {
    expect(rmsLevel([])).toBe(0);
  });
});

describe('pushLevel', () => {
  it('keeps the newest bars on the right and never more than the wave holds', () => {
    let levels: number[] = [];
    for (let index = 0; index < WAVE_BARS + 5; index++) levels = pushLevel(levels, index / 100);

    expect(levels).toHaveLength(WAVE_BARS);
    expect(levels.at(-1)).toBeCloseTo((WAVE_BARS + 4) / 100);
  });

  it('shows silence as a short tick and clamps loud input', () => {
    expect(pushLevel([], 0)).toEqual([0.04]);
    expect(pushLevel([], 3)).toEqual([1]);
  });
});
