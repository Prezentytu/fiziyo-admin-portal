import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextImportPanel } from './TextImportPanel';

const originalClipboard = navigator.clipboard;

describe('TextImportPanel', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
    });
  });

  it('aktualizuje textarea i pokazuje licznik znaków', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();

    render(<TextImportPanel text="" onTextChange={onTextChange} />);

    const textarea = screen.getByTestId('import-textarea-input');
    await user.type(textarea, 'Nowa tresc');

    expect(onTextChange).toHaveBeenCalled();
    expect(screen.getByTestId('import-text-char-count')).toHaveTextContent('0/30 znaków');
  });

  it('pokazuje fallback gdy schowek nie jest dostępny', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();

    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });

    render(<TextImportPanel text="" onTextChange={onTextChange} />);
    await user.click(screen.getByTestId('import-text-clipboard-btn'));

    expect(screen.getByText(/nie wspiera wklejania ze schowka/i)).toBeInTheDocument();
    expect(onTextChange).not.toHaveBeenCalled();
  });

  it('wkleja tekst ze schowka gdy API jest dostępne', async () => {
    const user = userEvent.setup();
    const onTextChange = vi.fn();
    const readText = vi.fn().mockResolvedValue('Skopiowany plan rehabilitacji');

    Object.defineProperty(navigator, 'clipboard', {
      value: { readText },
      configurable: true,
    });

    render(<TextImportPanel text="" onTextChange={onTextChange} />);
    await user.click(screen.getByTestId('import-text-clipboard-btn'));

    expect(readText).toHaveBeenCalledTimes(1);
    expect(onTextChange).toHaveBeenCalledWith('Skopiowany plan rehabilitacji');
  });
});
