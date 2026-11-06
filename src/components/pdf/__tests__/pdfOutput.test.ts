import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showPdfInWindow } from '../pdfOutput';

function fakeWindow(overrides: Partial<{ closed: boolean; readyState: string }> = {}) {
  const target = {
    closed: overrides.closed ?? false,
    location: { href: '' },
    document: { readyState: overrides.readyState ?? 'complete' },
    focus: vi.fn(),
    print: vi.fn(),
  };
  return target;
}

describe('showPdfInWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:karta');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('bez karty (popup zablokowany) pobiera plik', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    expect(showPdfInWindow(new Blob(), null, 'karta.pdf')).toBe('downloaded');
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  it('drukuje, gdy karta załaduje PDF, i nie zwalnia blob URL od razu', () => {
    const target = fakeWindow();

    expect(showPdfInWindow(new Blob(), target as unknown as Window, 'karta.pdf', { print: true })).toBe('opened');
    expect(target.location.href).toBe('blob:karta');
    vi.advanceTimersByTime(200);
    expect(target.print).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:karta');
  });

  it('gdy karta nie załaduje się w limicie, mówi o tym zamiast porzucić druk po cichu', () => {
    const target = fakeWindow({ readyState: 'loading' });
    const onPrintUnavailable = vi.fn();

    showPdfInWindow(new Blob(), target as unknown as Window, 'karta.pdf', { print: true, onPrintUnavailable });
    vi.advanceTimersByTime(200 * 51);
    expect(target.print).not.toHaveBeenCalled();
    expect(onPrintUnavailable).toHaveBeenCalledTimes(1);
  });

  it('zamknięta przez użytkownika karta kończy czekanie bez komunikatu', () => {
    const target = fakeWindow({ readyState: 'loading' });
    const onPrintUnavailable = vi.fn();

    showPdfInWindow(new Blob(), target as unknown as Window, 'karta.pdf', { print: true, onPrintUnavailable });
    target.closed = true;
    vi.advanceTimersByTime(200 * 60);
    expect(onPrintUnavailable).not.toHaveBeenCalled();
  });
});
