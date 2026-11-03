import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, parseStoredPreferences } from '../AccessibilityContext';

describe('parseStoredPreferences', () => {
  it('returns defaults for missing or broken storage', () => {
    expect(parseStoredPreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parseStoredPreferences('{not json')).toEqual(DEFAULT_PREFERENCES);
    expect(parseStoredPreferences('[]')).toEqual(DEFAULT_PREFERENCES);
  });

  it('fills fields missing from a partial object', () => {
    expect(parseStoredPreferences(JSON.stringify({ theme: 'light' }))).toEqual({ ...DEFAULT_PREFERENCES, theme: 'light' });
  });

  it('drops unknown values instead of crashing on them', () => {
    const parsed = parseStoredPreferences(JSON.stringify({ theme: 'sepia', fontSize: 'huge', highContrast: 'yes' }));
    expect(parsed).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps a complete valid object', () => {
    const stored = { theme: 'system', fontSize: 'large', highContrast: true, reducedMotion: true };
    expect(parseStoredPreferences(JSON.stringify(stored))).toEqual(stored);
  });
});
