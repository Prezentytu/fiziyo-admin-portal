import { z } from 'zod';

const themeSchema = z.enum(['light', 'dark', 'system']);
const fontSizeSchema = z.enum(['small', 'normal', 'large', 'xlarge']);

export type Theme = z.infer<typeof themeSchema>;
export type FontSize = z.infer<typeof fontSizeSchema>;

export const accessibilityPreferencesSchema = z.object({
  theme: themeSchema.catch('light'),
  fontSize: fontSizeSchema.catch('normal'),
  highContrast: z.boolean().catch(false),
  reducedMotion: z.boolean().catch(false),
});

export type AccessibilityPreferences = z.infer<typeof accessibilityPreferencesSchema>;
export type ResolvedTheme = Exclude<Theme, 'system'>;

export const DEFAULT_PREFERENCES: AccessibilityPreferences = accessibilityPreferencesSchema.parse({});
export const STORAGE_KEY = 'fiziyo-accessibility';
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

export const FONT_SIZE_VALUES: Record<FontSize, { label: string; scale: number; css: string }> = {
  small: { label: 'Ma\u0142y', scale: 1, css: '16px' },
  normal: { label: 'Normalny', scale: 1.125, css: '18px' },
  large: { label: 'Du\u017cy', scale: 1.25, css: '20px' },
  xlarge: { label: 'Bardzo du\u017cy', scale: 1.375, css: '22px' },
};

export function parseAccessibilityPreferences(value: unknown): AccessibilityPreferences {
  const result = accessibilityPreferencesSchema.safeParse(value);
  return result.success ? result.data : { ...DEFAULT_PREFERENCES };
}

export function readAccessibilityPreferences(): AccessibilityPreferences {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return parseAccessibilityPreferences(saved ? JSON.parse(saved) : null);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveAccessibilityPreferences(preferences: AccessibilityPreferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    return;
  }
}

export function resolveTheme(theme: Theme, prefersDark: boolean): ResolvedTheme {
  return theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
}

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences): ResolvedTheme {
  const theme = resolveTheme(preferences.theme, window.matchMedia(SYSTEM_THEME_QUERY).matches);
  const root = document.documentElement;
  const fontSize = FONT_SIZE_VALUES[preferences.fontSize].css;
  root.classList.toggle('light-theme', theme === 'light');
  root.classList.toggle('dark-theme', theme === 'dark');
  root.classList.toggle('high-contrast', preferences.highContrast);
  root.classList.toggle('reduced-motion', preferences.reducedMotion);
  root.style.colorScheme = theme;
  root.style.fontSize = fontSize;
  root.style.setProperty('--base-font-size', fontSize);
  return theme;
}

export function getAccessibilityScript(): string {
  const config = JSON.stringify({
    defaults: DEFAULT_PREFERENCES,
    themes: themeSchema.options,
    fontSizes: fontSizeSchema.options,
    sizes: FONT_SIZE_VALUES,
    storageKey: STORAGE_KEY,
    mediaQuery: SYSTEM_THEME_QUERY,
  }).replace(/</g, '\\u003c');

  return `(function(config) {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(config.storageKey)); } catch {}
    var prefs = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    var theme = config.themes.includes(prefs.theme) ? prefs.theme : config.defaults.theme;
    var fontSize = config.fontSizes.includes(prefs.fontSize) ? prefs.fontSize : config.defaults.fontSize;
    if (theme === 'system') theme = window.matchMedia(config.mediaQuery).matches ? 'dark' : 'light';
    var root = document.documentElement;
    root.classList.toggle('light-theme', theme === 'light');
    root.classList.toggle('dark-theme', theme === 'dark');
    root.classList.toggle('high-contrast', prefs.highContrast === true);
    root.classList.toggle('reduced-motion', prefs.reducedMotion === true);
    root.style.colorScheme = theme;
    root.style.fontSize = config.sizes[fontSize].css;
    root.style.setProperty('--base-font-size', config.sizes[fontSize].css);
  })(${config});`;
}