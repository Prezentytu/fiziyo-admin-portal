import { describe, expect, it } from 'vitest';

import { resolveStickyColumnTop } from './useStickyColumnTop';

describe('resolveStickyColumnTop', () => {
  it('kolumna mieści się w oknie: trzyma się góry', () => {
    expect(resolveStickyColumnTop({ viewportHeight: 828, columnHeight: 600, gap: 24 })).toBe(24);
  });

  it('kolumna wyższa niż okno: staje dopiero, gdy widać jej dół', () => {
    // 1010 px kolumny w oknie 828 px: dół kolumny ląduje 24 px nad dolną krawędzią.
    const top = resolveStickyColumnTop({ viewportHeight: 828, columnHeight: 1010, gap: 24 });
    expect(top).toBe(-206);
    expect(top + 1010).toBe(828 - 24);
  });

  it('pasek zapisu na dole zabiera miejsce kolumnie', () => {
    expect(resolveStickyColumnTop({ viewportHeight: 828, columnHeight: 760, gap: 24 })).toBe(24);
    expect(resolveStickyColumnTop({ viewportHeight: 828, columnHeight: 760, gap: 24, bottomReserve: 64 })).toBe(-20);
  });
});
