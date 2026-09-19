import { describe, expect, it } from 'vitest';

import {
  detectContactType,
  isCompletePatientContact,
  isValidEmail,
  isValidPhone,
  shouldAutoAdvanceContact,
} from './patientContact';

describe('patientContact', () => {
  it('klasyfikuje email, telefon i śmieci', () => {
    expect(detectContactType('jan@gabinet.pl')).toBe('email');
    expect(detectContactType('500600700')).toBe('phone');
    expect(detectContactType('500 600 700')).toBe('phone');
    expect(detectContactType('abc')).toBe('unknown');
  });

  it('uznaje kompletny kontakt dopiero przy poprawnym emailu albo 9 cyfrach', () => {
    expect(isValidEmail('jan@gabinet.pl')).toBe(true);
    expect(isValidEmail('jan@gabinet')).toBe(false);
    expect(isValidPhone('500600700')).toBe(true);
    expect(isValidPhone('50060070')).toBe(false);
    expect(isCompletePatientContact(' jan@gabinet.pl ')).toBe(true);
    expect(isCompletePatientContact('500600700')).toBe(true);
    expect(isCompletePatientContact('jan@')).toBe(false);
  });

  it('shouldAutoAdvanceContact pomija puste, niekompletne i już wysłane wartości', () => {
    expect(shouldAutoAdvanceContact('', '')).toBe(false);
    expect(shouldAutoAdvanceContact('jan@', '')).toBe(false);
    expect(shouldAutoAdvanceContact('jan@gabinet.pl', '')).toBe(true);
    expect(shouldAutoAdvanceContact('jan@gabinet.pl', 'jan@gabinet.pl')).toBe(false);
    expect(shouldAutoAdvanceContact('500600700', '')).toBe(true);
    expect(shouldAutoAdvanceContact('500600700', '500600700')).toBe(false);
  });
});
