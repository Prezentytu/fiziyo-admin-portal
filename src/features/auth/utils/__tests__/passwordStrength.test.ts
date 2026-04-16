import { describe, expect, it } from 'vitest';

import { calculatePasswordStrength, maskEmail } from '../passwordStrength';

describe('calculatePasswordStrength', () => {
  it('zwraca score 0 dla pustego hasla', () => {
    const result = calculatePasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.criteria).toEqual({
      minLength: false,
      hasNumber: false,
      hasUppercase: false,
      hasSpecial: false,
    });
  });

  it('zwraca score 1 dla hasla spelniajacego tylko jedno kryterium', () => {
    const result = calculatePasswordStrength('abc');
    expect(result.score).toBe(0);

    const onlyUppercase = calculatePasswordStrength('A');
    expect(onlyUppercase.score).toBe(1);
    expect(onlyUppercase.criteria.hasUppercase).toBe(true);
  });

  it('zwraca score 2 dla hasla 8+ znakow i jednej malej litery', () => {
    const result = calculatePasswordStrength('abcdefgh');
    expect(result.score).toBe(1);
    expect(result.criteria.minLength).toBe(true);
  });

  it('zwraca score 3 dla hasla z liczba, wielka litera i 8 znakami', () => {
    const result = calculatePasswordStrength('Abcdefg1');
    expect(result.score).toBe(3);
    expect(result.criteria).toEqual({
      minLength: true,
      hasNumber: true,
      hasUppercase: true,
      hasSpecial: false,
    });
  });

  it('zwraca score 4 dla silnego hasla ze wszystkimi kryteriami', () => {
    const result = calculatePasswordStrength('Abcdef1!');
    expect(result.score).toBe(4);
    expect(result.criteria).toEqual({
      minLength: true,
      hasNumber: true,
      hasUppercase: true,
      hasSpecial: true,
    });
  });

  it('rozpoznaje znaki specjalne Unicode i typowe symbole', () => {
    expect(calculatePasswordStrength('Password1@').criteria.hasSpecial).toBe(true);
    expect(calculatePasswordStrength('Password1 ').criteria.hasSpecial).toBe(true);
    expect(calculatePasswordStrength('Password1_').criteria.hasSpecial).toBe(true);
  });
});

describe('maskEmail', () => {
  it('maskuje typowy adres email zachowujac pierwsza litere i ostatnie 4', () => {
    expect(maskEmail('yevovi5413@imfaya.com')).toBe('y•••••5413@imfaya.com');
  });

  it('maskuje krotkie localparty 3-5 znakow pierwsza i ostatnia litera', () => {
    expect(maskEmail('jan@example.com')).toBe('j•••n@example.com');
    expect(maskEmail('ania@test.pl')).toBe('a•••a@test.pl');
  });

  it('maskuje bardzo krotkie localparty 1-2 znaki tylko pierwsza litera', () => {
    expect(maskEmail('a@test.pl')).toBe('a•••@test.pl');
    expect(maskEmail('ab@test.pl')).toBe('a•••@test.pl');
  });

  it('zwraca oryginalny string gdy brak @', () => {
    expect(maskEmail('invalid-email')).toBe('invalid-email');
  });

  it('trimuje biale znaki', () => {
    expect(maskEmail('  yevovi5413@imfaya.com  ')).toBe('y•••••5413@imfaya.com');
  });
});
