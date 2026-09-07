import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { AccessibilityProvider } from '@/contexts/AccessibilityContext';
import {
  DEFAULT_PREFERENCES,
  STORAGE_KEY,
  SYSTEM_THEME_QUERY,
  type AccessibilityPreferences,
} from '@/lib/accessibilityPreferences';
import { AccessibilitySettings } from '../AccessibilitySettings';

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

const scrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

function renderSettings() {
  return render(
    <AccessibilityProvider>
      <AccessibilitySettings />
    </AccessibilityProvider>
  );
}

describe('AccessibilitySettings', () => {
  let systemTheme: MediaQueryList;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    const mediaEvents = new EventTarget();
    systemTheme = {
      matches: true,
      media: SYSTEM_THEME_QUERY,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
      removeEventListener: mediaEvents.removeEventListener.bind(mediaEvents),
      dispatchEvent: mediaEvents.dispatchEvent.bind(mediaEvents),
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => systemTheme)
    );
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('style');
    vi.unstubAllGlobals();
    if (scrollIntoViewDescriptor) {
      Object.defineProperty(Element.prototype, 'scrollIntoView', scrollIntoViewDescriptor);
    } else {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    }
  });

  it('labels the radio groups and defaults to light with normal text even when the OS is dark', async () => {
    renderSettings();

    const themes = await screen.findByRole('radiogroup', { name: 'Motyw' });
    const fontSizes = screen.getByRole('radiogroup', { name: 'Rozmiar czcionki' });

    expect(
      within(themes)
        .getAllByRole('radio')
        .map((radio) => radio.dataset.testid)
    ).toEqual(['settings-theme-light', 'settings-theme-dark', 'settings-theme-system']);
    expect(within(themes).getByRole('radio', { name: 'Jasny' })).toBeChecked();
    expect(within(themes).getByRole('radio', { name: 'Ciemny' })).not.toBeChecked();
    expect(within(themes).getByRole('radio', { name: 'Systemowy' })).not.toBeChecked();
    expect(within(fontSizes).getAllByRole('radio')).toHaveLength(4);
    expect(within(fontSizes).getByRole('radio', { name: 'Normalny' })).toBeChecked();
    expect(document.documentElement).toHaveClass('light-theme');
    expect(document.documentElement).not.toHaveClass('dark-theme');
    expect(document.documentElement.style.fontSize).toBe('18px');
  });

  it.each([
    { theme: 'light', label: 'Jasny', resolved: 'light' },
    { theme: 'dark', label: 'Ciemny', resolved: 'dark' },
    { theme: 'system', label: 'Systemowy', resolved: 'dark' },
  ] as const)(
    'selects and restores the persisted $theme theme without losing other preferences',
    async ({ theme, label, resolved }) => {
      const user = userEvent.setup();
      const initialPreferences: AccessibilityPreferences = {
        ...DEFAULT_PREFERENCES,
        theme: theme === 'light' ? 'dark' : 'light',
        fontSize: 'large',
        highContrast: true,
        reducedMotion: true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPreferences));
      const view = renderSettings();
      await screen.findByRole('radiogroup', { name: 'Motyw' });

      await user.click(screen.getByText(label, { exact: true }));

      expect(screen.getByTestId(`settings-theme-${theme}`)).toBe(screen.getByRole('radio', { name: label }));
      expect(screen.getByRole('radio', { name: label })).toBeChecked();
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ ...initialPreferences, theme }));
      expect(document.documentElement).toHaveClass(`${resolved}-theme`, 'high-contrast', 'reduced-motion');
      expect(document.documentElement.style.fontSize).toBe('20px');

      view.unmount();
      renderSettings();

      expect(await screen.findByRole('radio', { name: label })).toBeChecked();
      expect(document.documentElement.style.colorScheme).toBe(resolved);
    }
  );

  it('keeps Systemowy selected when the operating system changes theme', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(await screen.findByRole('radio', { name: 'Systemowy' }));
    expect(document.documentElement).toHaveClass('dark-theme');

    act(() => {
      Object.defineProperty(systemTheme, 'matches', { value: false, configurable: true });
      systemTheme.dispatchEvent(new Event('change'));
    });

    expect(screen.getByRole('radio', { name: 'Systemowy' })).toBeChecked();
    expect(document.documentElement).toHaveClass('light-theme');
    expect(document.documentElement).not.toHaveClass('dark-theme');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ ...DEFAULT_PREFERENCES, theme: 'system' }));
  });

  it.each([
    { fontSize: 'small', label: 'Ma\u0142y', css: '16px' },
    { fontSize: 'normal', label: 'Normalny', css: '18px' },
    { fontSize: 'large', label: 'Du\u017cy', css: '20px' },
    { fontSize: 'xlarge', label: 'Bardzo du\u017cy', css: '22px' },
  ] as const)('applies and persists the $fontSize font size', async ({ fontSize, label, css }) => {
    const user = userEvent.setup();
    const initialPreferences: AccessibilityPreferences = {
      theme: 'dark',
      fontSize: fontSize === 'large' ? 'small' : 'large',
      highContrast: true,
      reducedMotion: true,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPreferences));
    renderSettings();
    await screen.findByRole('radiogroup', { name: 'Rozmiar czcionki' });

    await user.click(screen.getByText(label, { exact: true }));

    expect(screen.getByTestId(`settings-fontsize-${fontSize}`)).toBe(screen.getByRole('radio', { name: label }));
    expect(screen.getByRole('radio', { name: label })).toBeChecked();
    expect(document.documentElement.style.fontSize).toBe(css);
    expect(document.documentElement.style.getPropertyValue('--base-font-size')).toBe(css);
    expect(document.documentElement).toHaveClass('dark-theme', 'high-contrast', 'reduced-motion');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ ...initialPreferences, fontSize }));
  });

  it.each([
    {
      preference: 'highContrast',
      otherPreference: 'reducedMotion',
      label: 'Wysoki kontrast',
      className: 'high-contrast',
      testId: 'settings-high-contrast-switch',
    },
    {
      preference: 'reducedMotion',
      otherPreference: 'highContrast',
      label: 'Ograniczone animacje',
      className: 'reduced-motion',
      testId: 'settings-reduced-motion-switch',
    },
  ] as const)(
    'toggles $preference through its label and Space without changing other preferences',
    async ({ preference, otherPreference, label, className, testId }) => {
      const user = userEvent.setup();
      const initialPreferences: AccessibilityPreferences = {
        ...DEFAULT_PREFERENCES,
        theme: 'dark',
        fontSize: 'large',
        [otherPreference]: true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPreferences));
      renderSettings();
      const control = await screen.findByRole('switch', { name: label });
      expect(screen.getByTestId(testId)).toBe(control);
      expect(control).not.toBeChecked();

      await user.click(screen.getByText(label, { exact: true }));

      expect(control).toBeChecked();
      expect(document.documentElement).toHaveClass(className);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ ...initialPreferences, [preference]: true }));

      act(() => control.focus());
      await user.keyboard('[Space]');

      expect(control).not.toBeChecked();
      expect(document.documentElement).not.toHaveClass(className);
      expect(document.documentElement).toHaveClass('dark-theme');
      expect(document.documentElement.style.fontSize).toBe('20px');
      expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(initialPreferences));
    }
  );

  it('resets every preference to light defaults and keeps the reset toast', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        theme: 'dark',
        fontSize: 'xlarge',
        highContrast: true,
        reducedMotion: true,
      })
    );
    renderSettings();
    await user.click(await screen.findByTestId('settings-reset-defaults-btn'));

    expect(screen.getByRole('radio', { name: 'Jasny' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Normalny' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Wysoki kontrast' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Ograniczone animacje' })).not.toBeChecked();
    expect(document.documentElement).toHaveClass('light-theme');
    expect(document.documentElement).not.toHaveClass('dark-theme', 'high-contrast', 'reduced-motion');
    expect(document.documentElement.style.fontSize).toBe('18px');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(DEFAULT_PREFERENCES));
    expect(toast.success).toHaveBeenCalledExactlyOnceWith('Przywr\u00f3cono domy\u015blne ustawienia');
  });

  it('navigates both radio groups with Tab and arrows, including wraparound', async () => {
    const user = userEvent.setup();
    renderSettings();
    const light = await screen.findByRole('radio', { name: 'Jasny' });
    await user.tab();
    expect(light).toHaveFocus();

    const themeSteps = [
      { key: 'ArrowLeft', label: 'Systemowy' },
      { key: 'ArrowRight', label: 'Jasny' },
      { key: 'ArrowDown', label: 'Ciemny' },
      { key: 'ArrowUp', label: 'Jasny' },
    ];
    for (const { key, label } of themeSteps) {
      await user.keyboard(`[${key}>]`);
      await waitFor(() => expect(screen.getByRole('radio', { name: label })).toBeChecked());
      expect(screen.getByRole('radio', { name: label })).toHaveFocus();
      await user.keyboard(`[/${key}]`);
    }

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Normalny' })).toHaveFocus();

    const fontSteps = [
      { key: 'ArrowDown', label: 'Du\u017cy' },
      { key: 'ArrowRight', label: 'Bardzo du\u017cy' },
      { key: 'ArrowRight', label: 'Ma\u0142y' },
      { key: 'ArrowLeft', label: 'Bardzo du\u017cy' },
    ];
    for (const { key, label } of fontSteps) {
      await user.keyboard(`[${key}>]`);
      await waitFor(() => expect(screen.getByRole('radio', { name: label })).toBeChecked());
      expect(screen.getByRole('radio', { name: label })).toHaveFocus();
      await user.keyboard(`[/${key}]`);
    }
    expect(document.documentElement.style.fontSize).toBe('22px');

    await user.tab();
    expect(screen.getByRole('switch', { name: 'Wysoki kontrast' })).toHaveFocus();
  });

  it.each(['Ciemny', 'Bardzo du\u017cy'])('selects the focused unchecked %s radio with Space', async (label) => {
    const user = userEvent.setup();
    renderSettings();
    const radio = await screen.findByRole('radio', { name: label });
    act(() => radio.focus());
    expect(radio).not.toBeChecked();

    await user.keyboard('[Space]');

    expect(radio).toBeChecked();
    expect(radio).toHaveFocus();
  });

  it('renders safe defaults for a stored null preference object', async () => {
    localStorage.setItem(STORAGE_KEY, 'null');
    renderSettings();

    expect(await screen.findByRole('radio', { name: 'Jasny' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Normalny' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Wysoki kontrast' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Ograniczone animacje' })).not.toBeChecked();
  });
});
