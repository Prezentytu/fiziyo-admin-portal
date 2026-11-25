import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PhotoReplaceDialog } from './PhotoReplaceDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof PhotoReplaceDialog>> = {}) {
  const handlers = {
    onOpenChange: vi.fn(),
    onGenerate: vi.fn(),
    onUploadOwn: vi.fn(),
    onImageStyleChange: vi.fn(),
  };
  render(
    <PhotoReplaceDialog
      open
      photoLabel="zdjęcie 2"
      isGenerating={false}
      imageStyle="illustration"
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

describe('PhotoReplaceDialog', () => {
  it('nowe zdjęcie: wybór stylu i wskazówki dla AI, bez listy problemów i wgrywania', async () => {
    const user = userEvent.setup();
    const handlers = renderDialog({ isNew: true });

    expect(screen.getByTestId('verification-photo-style-group')).toBeInTheDocument();
    expect(screen.queryByTestId('verification-photo-problem-0-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('verification-photo-replace-upload-btn')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('verification-photo-style-photo'));
    expect(handlers.onImageStyleChange).toHaveBeenCalledWith('photo');

    await user.type(screen.getByTestId('verification-photo-replace-note-input'), 'widok z boku');
    await user.click(screen.getByTestId('verification-photo-replace-generate-btn'));
    expect(handlers.onGenerate).toHaveBeenCalledWith([], 'widok z boku');
  });

  it('podmiana zdjęcia: styl obok listy problemów i „Wgraj własne”', () => {
    renderDialog({ imageStyle: 'diagram' });

    expect(screen.getByTestId('verification-photo-style-diagram')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('verification-photo-problem-0-btn')).toBeInTheDocument();
    expect(screen.getByTestId('verification-photo-replace-upload-btn')).toBeInTheDocument();
  });
});
