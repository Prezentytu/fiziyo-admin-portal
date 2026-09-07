import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DESIGN_PREFERENCE,
  applyDesignVariant,
  getDesignVariantScript,
  isDesignPreviewEnabled,
  parseDesignVariant,
  readDesignVariant,
  saveDesignVariant,
} from '../preferences';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  localStorage.clear();
  document.documentElement.setAttribute(DESIGN_PREFERENCE.attribute, 'current');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
  document.documentElement.removeAttribute(DESIGN_PREFERENCE.attribute);
});

describe('design preview preferences', () => {
  it.each([undefined, null, '', 'new', 'REDESIGN', '"redesign"', '{', {}, [], 1])(
    'defaults invalid input %j to current',
    (value) => expect(parseDesignVariant(value)).toBe('current')
  );

  it.each(['current', 'redesign'] as const)('persists only the %s enum under its own key', (variant) => {
    localStorage.setItem('fiziyo-accessibility', '{"theme":"dark"}');
    saveDesignVariant(variant);
    expect(localStorage.getItem(DESIGN_PREFERENCE.storageKey)).toBe(variant);
    expect(readDesignVariant()).toBe(variant);
    expect(localStorage.getItem('fiziyo-accessibility')).toBe('{"theme":"dark"}');
    expect(localStorage.length).toBe(2);
  });

  it.each([null, 'current', 'redesign', '"redesign"', '{}', '{', 'invalid'])(
    'agrees with bootstrap before paint for saved %j',
    (saved) => {
      if (saved !== null) localStorage.setItem(DESIGN_PREFERENCE.storageKey, saved);
      const root = document.documentElement;
      root.className = 'dark-theme high-contrast reduced-motion';
      root.style.fontSize = '22px';
      const classes = root.className;
      const styles = root.getAttribute('style');
      new Function(getDesignVariantScript())();
      const beforePaint = root.getAttribute(DESIGN_PREFERENCE.attribute);
      expect(beforePaint).toBe(readDesignVariant());
      expect(applyDesignVariant(readDesignVariant())).toBe(beforePaint);
      expect(root.className).toBe(classes);
      expect(root.getAttribute('style')).toBe(styles);
    }
  );

  it('falls back when storage access is denied, including bootstrap', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Denied');
    });
    expect(readDesignVariant()).toBe('current');
    expect(() => new Function(getDesignVariantScript())()).not.toThrow();
    expect(document.documentElement).toHaveAttribute(DESIGN_PREFERENCE.attribute, 'current');
    expect(() => saveDesignVariant('redesign')).not.toThrow();
    expect(applyDesignVariant('redesign')).toBe('redesign');
  });

  it('allows an in-session change when storage writes fail', () => {
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue({
      getItem: () => null,
      setItem: () => {
        throw new Error('Full');
      },
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: () => null,
      length: 0,
    });
    saveDesignVariant('redesign');
    expect(applyDesignVariant('redesign')).toBe('redesign');
    expect(readDesignVariant()).toBe('current');
  });

  it.each(['production', 'test'])('forces current and never reads or writes storage in %s', (environment) => {
    localStorage.setItem(DESIGN_PREFERENCE.storageKey, 'redesign');
    vi.stubEnv('NODE_ENV', environment);
    const storageAccess = vi.spyOn(window, 'localStorage', 'get');
    expect(isDesignPreviewEnabled()).toBe(false);
    expect(getDesignVariantScript()).toBe('');
    expect(readDesignVariant()).toBe('current');
    expect(applyDesignVariant('redesign')).toBe('current');
    saveDesignVariant('redesign');
    expect(storageAccess).not.toHaveBeenCalled();
  });
});
