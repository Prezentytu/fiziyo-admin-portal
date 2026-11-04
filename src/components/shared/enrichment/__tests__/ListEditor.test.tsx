import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ListEditor } from '../ListEditor';

describe('ListEditor', () => {
  it('wyłącza kosz, gdy jedyny wiersz ma tylko placeholder', () => {
    render(
      <ListEditor
        title="Wskazówki"
        items={[]}
        placeholder="Np. „Pilnuj kolana”"
        addLabel="Dodaj wskazówkę"
        onChange={vi.fn()}
        testIdPrefix="cues"
      />
    );

    const removeButton = screen.getByTestId('cues-remove-0');
    expect(removeButton).toBeDisabled();
    expect(removeButton).toHaveAttribute('aria-label', 'Brak treści do usunięcia');
  });

  it('włącza kosz po dodaniu drugiego wiersza', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ListEditor
        title="Wskazówki"
        items={['']}
        placeholder="Np. „Pilnuj kolana”"
        addLabel="Dodaj wskazówkę"
        onChange={onChange}
        testIdPrefix="cues"
      />
    );

    await user.click(screen.getByTestId('cues-add-btn'));
    expect(onChange).toHaveBeenCalledWith(['', '']);
  });

  it('pozwala usunąć wiersz z treścią', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ListEditor
        title="Wskazówki"
        items={['Pilnuj kolana']}
        placeholder="Np. „Pilnuj kolana”"
        addLabel="Dodaj wskazówkę"
        onChange={onChange}
        testIdPrefix="cues"
      />
    );

    const removeButton = screen.getByTestId('cues-remove-0');
    expect(removeButton).toBeEnabled();
    await user.click(removeButton);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('podaje indeks usuniętego wiersza, żeby fazy wskazówek przesunęły się z listą', async () => {
    const user = userEvent.setup();
    const onRemoveItem = vi.fn();
    render(
      <ListEditor
        title="Wskazówki"
        items={['Pilnuj kolana', 'Oddychaj']}
        placeholder="Np. „Pilnuj kolana”"
        addLabel="Dodaj wskazówkę"
        onChange={vi.fn()}
        onRemoveItem={onRemoveItem}
        renderItemAccessory={(index) => <span data-testid={`cues-phase-${index}`} />}
        testIdPrefix="cues"
      />
    );

    await user.click(screen.getByTestId('cues-remove-0'));

    expect(onRemoveItem).toHaveBeenCalledWith(0);
    expect(screen.getByTestId('cues-phase-1')).toBeInTheDocument();
  });
});
