import { describe, expect, it } from 'vitest';

import { buildSetAssignHref, shouldOpenAssignOnLoad } from './setAssignHref';

describe('setAssignHref', () => {
  it('adres przypisania otwiera kreator na stronie zestawu', () => {
    const href = buildSetAssignHref('abc-123');
    const url = new URL(href, 'http://localhost');
    expect(url.pathname).toBe('/exercise-sets/abc-123');
    expect(shouldOpenAssignOnLoad(url.searchParams)).toBe(true);
  });

  it('bez parametru albo z inną wartością kreator się nie otwiera', () => {
    expect(shouldOpenAssignOnLoad(new URLSearchParams(''))).toBe(false);
    expect(shouldOpenAssignOnLoad(new URLSearchParams('assign=0'))).toBe(false);
    expect(shouldOpenAssignOnLoad(new URLSearchParams('from=patient-plans'))).toBe(false);
  });
});
