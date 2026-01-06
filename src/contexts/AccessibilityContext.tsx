'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// Typy ustawień
export type Theme = 'dark' | 'light' | 'system';
export type FontSize = 'small' | 'normal' | 'large' | 'xlarge';

export interface AccessibilityPreferences {
  theme: Theme;
  fontSize: FontSize;
  highContrast: boolean;
  reducedMotion: boolean;
}

export const FONT_SIZE_VALUES: Record<FontSize, { label: string; scale: number; css: string }> = {
  small: { label: 'Mały', scale: 0.875, css: '14px' },
  normal: { label: 'Normalny', scale: 1, css: '16px' },
  large: { label: 'Duży', scale: 1.125, css: '18px' },
  xlarge: { label: 'Bardzo duży', scale: 1.25, css: '20px' },
};

export const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  theme: 'dark',
  fontSize: 'normal',
  highContrast: false,
  reducedMotion: false,
};

export const STORAGE_KEY = 'fiziyo-accessibility';

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  updatePreference: <K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => void;
  resetToDefaults: () => void;
  isHydrated: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

// Funkcja aplikująca preferencje do DOM
function applyPreferences(prefs: AccessibilityPreferences) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // Rozmiar czcionki
  const fontSize = FONT_SIZE_VALUES[prefs.fontSize];
  root.style.setProperty('--base-font-size', fontSize.css);
  root.style.fontSize = fontSize.css;

  // Wysoki kontrast
  if (prefs.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  // Reduced motion
  if (prefs.reducedMotion) {
    root.classList.add('reduced-motion');
  } else {
    root.classList.remove('reduced-motion');
  }

  // Motyw (dark/light/system)
  if (prefs.theme === 'light') {
    root.classList.add('light-theme');
    root.classList.remove('dark-theme');
  } else if (prefs.theme === 'dark') {
    root.classList.remove('light-theme');
    root.classList.add('dark-theme');
  } else {
    // System preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    }
  }
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wczytanie preferencji z localStorage przy montowaniu (client-side)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AccessibilityPreferences;
        setPreferences(parsed);
        applyPreferences(parsed);
      } catch {
        // Ignore invalid JSON, use defaults
        applyPreferences(DEFAULT_PREFERENCES);
      }
    } else {
      applyPreferences(DEFAULT_PREFERENCES);
    }
    setIsHydrated(true);
  }, []);

  // Nasłuchiwanie na zmiany systemowego motywu (dla opcji "system")
  useEffect(() => {
    if (preferences.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyPreferences(preferences);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences]);

  // Aktualizacja pojedynczej preferencji
  const updatePreference = useCallback(<K extends keyof AccessibilityPreferences>(
    key: K,
    value: AccessibilityPreferences[K]
  ) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      applyPreferences(newPrefs);
      return newPrefs;
    });
  }, []);

  // Reset do domyślnych
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    applyPreferences(DEFAULT_PREFERENCES);
  }, []);

  // Memoizacja wartości kontekstu
  const value = useMemo<AccessibilityContextValue>(() => ({
    preferences,
    updatePreference,
    resetToDefaults,
    isHydrated,
  }), [preferences, updatePreference, resetToDefaults, isHydrated]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// Hook do korzystania z kontekstu
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
