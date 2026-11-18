import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComposerDraftContext } from '../../ComposerDraftContext';
import { ClarifyChips } from '../ClarifyChips';

// Decyzja właściciela 18.11: chip pokazuje pytanie, a do pola wiadomości trafia krótki temat (T-0036).
describe('ClarifyChips', () => {
  it('pokazuje pytanie, a klik wstawia temat z dwukropkiem', () => {
    const draft = vi.fn();
    render(
      <ComposerDraftContext.Provider value={draft}>
        <ClarifyChips
          lead="Doprecyzuj"
          questions={[{ label: 'Które biodro: lewe, prawe czy oba?', topic: 'Strona ciała' }]}
          testId="clarify"
        />
      </ComposerDraftContext.Provider>
    );

    const chip = screen.getByTestId('clarify-0-btn');
    expect(chip.textContent).toBe('Które biodro: lewe, prawe czy oba?');
    fireEvent.click(chip);
    expect(draft).toHaveBeenCalledWith('Strona ciała: ');

    fireEvent.click(screen.getByTestId('clarify-other-btn'));
    expect(draft).toHaveBeenLastCalledWith('Doprecyzowanie: ');
  });
});
