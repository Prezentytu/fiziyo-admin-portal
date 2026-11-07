import { describe, expect, it } from 'vitest';

import { canManageTag } from '../tagPermissions';

describe('canManageTag', () => {
  it('pozwala zarządzać tagiem organizacji każdemu, kto widzi stronę tagów', () => {
    expect(canManageTag({ isGlobal: false }, false)).toBe(true);
    expect(canManageTag({}, false)).toBe(true);
  });

  it('ukrywa akcje tagu globalnego przed użytkownikiem bez prawa do tagów globalnych', () => {
    expect(canManageTag({ isGlobal: true }, false)).toBe(false);
  });

  it('pozwala zespołowi FiziYo zarządzać tagiem globalnym', () => {
    expect(canManageTag({ isGlobal: true }, true)).toBe(true);
  });
});
