import { StrictMode, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesignVariantProvider } from '../DesignVariantProvider';
import { DesignSwitcher } from '../DesignSwitcher';
import { DESIGN_PREFERENCE, getDesignVariantScript } from '../preferences';

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development');
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
  document.documentElement.removeAttribute(DESIGN_PREFERENCE.attribute);
});

describe('DesignVariantProvider', () => {
  it('keeps descendants mounted and both controls synchronized through a keyboard roundtrip', async () => {
    const mount = vi.fn();
    const unmount = vi.fn();
    function Descendant() {
      useEffect(() => {
        mount();
        return unmount;
      }, []);
      return <input data-testid="test-design-draft" aria-label="Draft" defaultValue="" />;
    }
    const user = userEvent.setup();
    render(
      <StrictMode>
        <DesignVariantProvider>
          <DesignSwitcher />
          <Descendant />
          <DesignSwitcher location="dialog" />
        </DesignVariantProvider>
      </StrictMode>
    );
    const current = screen.getByTestId('common-design-header-current');
    await waitFor(() => expect(current).toBeEnabled());
    const draft = screen.getByRole('textbox', { name: 'Draft' });
    await user.type(draft, 'Unwritten plan');
    const initialMounts = mount.mock.calls.length;
    const initialUnmounts = unmount.mock.calls.length;
    current.focus();
    await user.keyboard('{ArrowRight>}');
    await waitFor(() => expect(screen.getByTestId('common-design-header-redesign')).toBeChecked());
    await user.keyboard('{/ArrowRight}');
    expect(screen.getByTestId('common-design-dialog-redesign')).toBeChecked();
    expect(document.documentElement).toHaveAttribute(DESIGN_PREFERENCE.attribute, 'redesign');
    await user.keyboard('{ArrowLeft>}');
    await waitFor(() => expect(current).toBeChecked());
    await user.keyboard('{/ArrowLeft} ');
    expect(current).toHaveFocus();
    expect(screen.getByRole('textbox')).toBe(draft);
    expect(draft).toHaveValue('Unwritten plan');
    expect(mount).toHaveBeenCalledTimes(initialMounts);
    expect(unmount).toHaveBeenCalledTimes(initialUnmounts);
    expect(localStorage.getItem(DESIGN_PREFERENCE.storageKey)).toBe('current');
  });

  it('preserves bootstrap appearance while hydrating the same server DOM without errors', async () => {
    localStorage.setItem(DESIGN_PREFERENCE.storageKey, 'redesign');
    const view = (
      <DesignVariantProvider>
        <DesignSwitcher />
        <input data-testid="test-hydration-draft" aria-label="Draft" defaultValue="Plan" />
      </DesignVariantProvider>
    );
    const host = document.createElement('div');
    host.innerHTML = renderToString(view);
    document.body.appendChild(host);
    const input = host.querySelector('[data-testid="test-hydration-draft"]');
    new Function(getDesignVariantScript())();
    expect(document.documentElement).toHaveAttribute(DESIGN_PREFERENCE.attribute, 'redesign');
    const recoverableError = vi.fn();
    const consoleError = vi.spyOn(console, 'error');
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(host, view, { onRecoverableError: recoverableError });
      });
      expect(within(host).getByRole('radio', { name: 'Nowy' })).toBeChecked();
      expect(host.querySelector('[data-testid="test-hydration-draft"]')).toBe(input);
      expect(document.documentElement).toHaveAttribute(DESIGN_PREFERENCE.attribute, 'redesign');
      expect(recoverableError).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      await act(async () => root?.unmount());
      host.remove();
    }
  });

  it('restores preference on remount but ignores changes from other tabs', async () => {
    localStorage.setItem(DESIGN_PREFERENCE.storageKey, 'redesign');
    const view = () => (
      <DesignVariantProvider>
        <DesignSwitcher />
      </DesignVariantProvider>
    );
    const first = render(view());
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Nowy' })).toBeChecked());
    localStorage.setItem(DESIGN_PREFERENCE.storageKey, 'current');
    window.dispatchEvent(new StorageEvent('storage', { key: DESIGN_PREFERENCE.storageKey, newValue: 'current' }));
    expect(screen.getByRole('radio', { name: 'Nowy' })).toBeChecked();
    first.unmount();
    render(view());
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Obecny' })).toBeEnabled());
    expect(screen.getByRole('radio', { name: 'Obecny' })).toBeChecked();
  });

  it('keeps switching usable without localStorage', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Denied');
    });
    const user = userEvent.setup();
    render(
      <DesignVariantProvider>
        <DesignSwitcher />
      </DesignVariantProvider>
    );
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Nowy' })).toBeEnabled());
    await user.click(screen.getByRole('radio', { name: 'Nowy' }));
    expect(screen.getByRole('radio', { name: 'Nowy' })).toBeChecked();
    expect(document.documentElement).toHaveAttribute(DESIGN_PREFERENCE.attribute, 'redesign');
  });

  it('hides preview controls and forces current in production despite saved redesign', async () => {
    localStorage.setItem(DESIGN_PREFERENCE.storageKey, 'redesign');
    document.documentElement.setAttribute(DESIGN_PREFERENCE.attribute, 'redesign');
    vi.stubEnv('NODE_ENV', 'production');
    render(
      <DesignVariantProvider>
        <DesignSwitcher />
        <p>Clinical content</p>
      </DesignVariantProvider>
    );
    await waitFor(() => expect(document.documentElement).toHaveAttribute(DESIGN_PREFERENCE.attribute, 'current'));
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText('Clinical content')).toBeInTheDocument();
    expect(localStorage.getItem(DESIGN_PREFERENCE.storageKey)).toBe('redesign');
  });
});
