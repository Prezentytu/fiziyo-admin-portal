import { describe, expect, it } from 'vitest';

import { getTimerModeDescription, getTimerModeLabel } from '../timerModeCopy';

describe('timerModeCopy', () => {
  it('nie używa żargonu BEZ TIMERA', () => {
    expect(getTimerModeLabel(false)).toBe('Timer wyłączony');
    expect(getTimerModeLabel(true)).toBe('Timer w aplikacji');
    expect(getTimerModeLabel(false).toUpperCase()).not.toBe(getTimerModeLabel(false));
  });

  it('wyjaśnia związek z czasem powtórzenia', () => {
    expect(getTimerModeDescription(false)).toContain('Czas powtórzenia jest pusty');
    expect(getTimerModeDescription(true)).toContain('odlicza sekundy');
  });
});
