import { describe, expect, it } from 'vitest';
import { getCompactDisplayName, resolveDisplayName } from '../userDisplayName';

describe('userDisplayName helpers', () => {
  it('prefers first and last name over fullName', () => {
    const result = resolveDisplayName('clerkNickname', 'Adam', 'Wisniewski');
    expect(result).toBe('Adam Wisniewski');
  });

  it('falls back to fullName when personal data is missing', () => {
    const result = resolveDisplayName('yevovi543');
    expect(result).toBe('yevovi543');
  });

  it('keeps short names unchanged', () => {
    const result = getCompactDisplayName('Adam Wisniewski', 30);
    expect(result).toBe('Adam Wisniewski');
  });

  it('truncates long surname while preserving first name', () => {
    const result = getCompactDisplayName('Aleksandra Supermegahiperbardzodlugienazwisko', 24);

    expect(result.startsWith('Aleksandra ')).toBe(true);
    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(24);
  });
});
