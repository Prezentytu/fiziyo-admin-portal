import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessibilityProvider, useAccessibility, STORAGE_KEY } from '../AccessibilityContext';
import { Toaster } from '@/components/ui/sonner';

vi.mock('sonner', () => ({
  Toaster: ({ theme }: { theme: string }) => <output aria-label="Toast theme">{theme}</output>,
}));

describe('AccessibilityProvider', () => {
  let mediaQuery: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    mediaQuery = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
  });

  it('hydrates to light without overwriting storage', async () => {
    const { result } = renderHook(useAccessibility, { wrapper: AccessibilityProvider });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.resolvedTheme).toBe('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('preserves dark and font preferences, saves changes, and resets to light', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'dark', fontSize: 'xlarge', reducedMotion: true }));
    const { result } = renderHook(useAccessibility, { wrapper: AccessibilityProvider });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(result.current.resolvedTheme).toBe('dark');
    expect(document.documentElement.style.fontSize).toBe('22px');
    act(() => result.current.updatePreference('theme', 'light'));
    expect(result.current.preferences.reducedMotion).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).theme).toBe('light');
    act(() => result.current.resetToDefaults());
    expect(document.documentElement.className).toBe('light-theme');
    expect(document.documentElement.style.fontSize).toBe('18px');
  });

  it('preserves consecutive preference changes within the same render batch', async () => {
    const { result } = renderHook(useAccessibility, { wrapper: AccessibilityProvider });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.updatePreference('theme', 'dark');
      result.current.updatePreference('fontSize', 'xlarge');
    });
    expect(result.current.preferences).toMatchObject({ theme: 'dark', fontSize: 'xlarge' });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ theme: 'dark', fontSize: 'xlarge' });
  });

  it('follows OS changes only in system mode and cleans up its listener', async () => {
    const { result, unmount } = renderHook(useAccessibility, { wrapper: AccessibilityProvider });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    expect(mediaQuery.addEventListener).not.toHaveBeenCalled();
    act(() => result.current.updatePreference('theme', 'system'));
    expect(result.current.resolvedTheme).toBe('dark');
    const listener = mediaQuery.addEventListener.mock.calls[0][1] as () => void;
    act(() => { mediaQuery.matches = false; listener(); });
    expect(result.current.resolvedTheme).toBe('light');
    act(() => result.current.updatePreference('theme', 'dark'));
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', listener);
    expect(result.current.resolvedTheme).toBe('dark');
    unmount();
  });

  it('still allows session changes when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const { result } = renderHook(useAccessibility, { wrapper: AccessibilityProvider });
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => result.current.updatePreference('theme', 'dark'));
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('uses the resolved system theme for notifications', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'system' }));
    render(<AccessibilityProvider><Toaster /></AccessibilityProvider>);
    await waitFor(() => expect(screen.getByLabelText('Toast theme')).toHaveTextContent('dark'));
    const listener = mediaQuery.addEventListener.mock.calls[0][1] as () => void;
    act(() => { mediaQuery.matches = false; listener(); });
    expect(screen.getByLabelText('Toast theme')).toHaveTextContent('light');
  });
});