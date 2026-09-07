'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DEFAULT_PREFERENCES,
  SYSTEM_THEME_QUERY,
  applyAccessibilityPreferences,
  parseAccessibilityPreferences,
  readAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AccessibilityPreferences,
  type ResolvedTheme,
} from '@/lib/accessibilityPreferences';

export { DEFAULT_PREFERENCES, FONT_SIZE_VALUES, STORAGE_KEY } from '@/lib/accessibilityPreferences';
export type { AccessibilityPreferences, FontSize, Theme } from '@/lib/accessibilityPreferences';

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  resolvedTheme: ResolvedTheme;
  updatePreference: <K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) => void;
  resetToDefaults: () => void;
  isHydrated: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);
  const preferencesRef = useRef(DEFAULT_PREFERENCES);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    const savedPreferences = readAccessibilityPreferences();
    const theme = applyAccessibilityPreferences(savedPreferences);
    queueMicrotask(() => {
      if (!active) return;
      preferencesRef.current = savedPreferences;
      setPreferences(savedPreferences);
      setResolvedTheme(theme);
      setIsHydrated(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!isHydrated || preferences.theme !== 'system') return;

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
    const handleChange = () => {
      setResolvedTheme(applyAccessibilityPreferences(preferences));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isHydrated, preferences]);

  const updatePreference = useCallback(
    <K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) => {
      const nextPreferences = parseAccessibilityPreferences({ ...preferencesRef.current, [key]: value });
      preferencesRef.current = nextPreferences;
      setResolvedTheme(applyAccessibilityPreferences(nextPreferences));
      saveAccessibilityPreferences(nextPreferences);
      setPreferences(nextPreferences);
    },
    []
  );

  const resetToDefaults = useCallback(() => {
    preferencesRef.current = DEFAULT_PREFERENCES;
    setPreferences(DEFAULT_PREFERENCES);
    saveAccessibilityPreferences(DEFAULT_PREFERENCES);
    setResolvedTheme(applyAccessibilityPreferences(DEFAULT_PREFERENCES));
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      preferences,
      resolvedTheme,
      updatePreference,
      resetToDefaults,
      isHydrated,
    }),
    [preferences, resolvedTheme, updatePreference, resetToDefaults, isHydrated]
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
