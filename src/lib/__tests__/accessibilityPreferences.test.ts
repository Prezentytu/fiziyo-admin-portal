import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  FONT_SIZE_VALUES,
  STORAGE_KEY,
  applyAccessibilityPreferences,
  getAccessibilityScript,
  parseAccessibilityPreferences,
  readAccessibilityPreferences,
  resolveTheme,
  saveAccessibilityPreferences,
} from '../accessibilityPreferences';

function snapshotRoot() {
  const root = document.documentElement;
  return { className: root.className, style: root.style.cssText };
}

describe('accessibility preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
  });

  it('defaults to light even with a dark OS preference', () => {
    expect(readAccessibilityPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(applyAccessibilityPreferences(DEFAULT_PREFERENCES)).toBe('light');
    expect(document.documentElement.style.fontSize).toBe('18px');
  });

  it('preserves valid fields and recovers invalid fields independently', () => {
    expect(parseAccessibilityPreferences({ theme: 'dark', fontSize: 'invalid', highContrast: true, reducedMotion: 'yes' }))
      .toEqual({ theme: 'dark', fontSize: 'normal', highContrast: true, reducedMotion: false });
  });

  it.each([null, 'broken', [], 42])('recovers invalid preference objects: %j', (value) => {
    expect(parseAccessibilityPreferences(value)).toEqual(DEFAULT_PREFERENCES);
  });

  it('keeps the existing storage key and preferences', () => {
    const preferences = { ...DEFAULT_PREFERENCES, theme: 'dark' as const, fontSize: 'xlarge' as const };
    saveAccessibilityPreferences(preferences);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(preferences);
    expect(readAccessibilityPreferences()).toEqual(preferences);
  });

  it('handles unavailable storage without blocking theme application', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readAccessibilityPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(() => saveAccessibilityPreferences(DEFAULT_PREFERENCES)).not.toThrow();
    expect(() => new Function(getAccessibilityScript())()).not.toThrow();
    expect(document.documentElement.classList.contains('light-theme')).toBe(true);
  });

  it('resolves OS preference only for system mode', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  for (const theme of ['light', 'dark', 'system'] as const) {
    for (const fontSize of ['small', 'normal', 'large', 'xlarge'] as const) {
      it(`keeps bootstrap/provider parity for ${theme}/${fontSize}`, () => {
        const preferences = { theme, fontSize, highContrast: true, reducedMotion: true };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        new Function(getAccessibilityScript())();
        const bootstrap = snapshotRoot();
        applyAccessibilityPreferences(readAccessibilityPreferences());
        expect(snapshotRoot()).toEqual(bootstrap);
        expect(document.documentElement.style.fontSize).toBe(FONT_SIZE_VALUES[fontSize].css);
      });
    }
  }

  it.each([null, '{invalid', 'null', '[]', '{"theme":"dark","fontSize":"bad","highContrast":"yes"}'])
    ('keeps fallback bootstrap/provider parity for %s', (saved) => {
      if (saved !== null) localStorage.setItem(STORAGE_KEY, saved);
      new Function(getAccessibilityScript())();
      const bootstrap = snapshotRoot();
      applyAccessibilityPreferences(readAccessibilityPreferences());
      expect(snapshotRoot()).toEqual(bootstrap);
    });

  it('removes the previous theme and accessibility classes when resetting', () => {
    applyAccessibilityPreferences({ theme: 'dark', fontSize: 'xlarge', highContrast: true, reducedMotion: true });
    applyAccessibilityPreferences(DEFAULT_PREFERENCES);
    expect(document.documentElement.className).toBe('light-theme');
  });
});