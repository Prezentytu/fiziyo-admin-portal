import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComposerDraftContext } from '../../ComposerDraftContext';
import { ClarifyChips } from '../ClarifyChips';

const QUESTIONS = [
  { label: 'Jaki jest cel?', topic: 'Cel ćwiczeń', options: ['siła', 'rozciąganie', 'stabilizacja'], multi: true },
  { label: 'Które biodro?', topic: 'Strona ciała', options: ['lewe', 'prawe', 'oba'] },
];

function renderChips() {
  const draft = vi.fn();
  render(
    <ComposerDraftContext.Provider value={draft}>
      <ClarifyChips lead="Doprecyzuj" questions={QUESTIONS} testId="clarify" />
    </ComposerDraftContext.Provider>
  );
  const option = (question: number, index: number) =>
    screen.getByTestId(`clarify-${question}-option-${index}-btn`);
  return { draft, option };
}

// 25.11 (Przemek): odpowiedź wybiera się kliknięciem, a wiadomość jest gotowa do wysłania bez pisania.
describe('ClarifyChips', () => {
  it('pokazuje pytanie z gotowymi odpowiedziami, a klik składa wiadomość', () => {
    const { draft, option } = renderChips();

    expect(screen.getByTestId('clarify-0').textContent).toContain('Jaki jest cel?');
    fireEvent.click(option(0, 0));
    fireEvent.click(option(0, 2));
    fireEvent.click(option(1, 1));

    expect(option(0, 0).getAttribute('aria-pressed')).toBe('true');
    expect(draft).toHaveBeenLastCalledWith('Cel ćwiczeń: siła, stabilizacja\nStrona ciała: prawe');
  });

  it('w pytaniu jednokrotnym zamienia odpowiedź, a drugi klik ją odznacza', () => {
    const { draft, option } = renderChips();

    fireEvent.click(option(1, 0));
    fireEvent.click(option(1, 2));
    expect(draft).toHaveBeenLastCalledWith('Strona ciała: oba');
    expect(option(1, 0).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(option(1, 2));
    expect(draft).toHaveBeenLastCalledWith('');
  });

  it('„Inne…” dopisuje wolną linię pod wybranymi odpowiedziami', () => {
    const { draft, option } = renderChips();

    fireEvent.click(screen.getByTestId('clarify-other-btn'));
    expect(draft).toHaveBeenLastCalledWith('Doprecyzowanie: ');

    fireEvent.click(option(0, 1));
    fireEvent.click(screen.getByTestId('clarify-other-btn'));
    expect(draft).toHaveBeenLastCalledWith('Cel ćwiczeń: rozciąganie\nDoprecyzowanie: ');
  });
});
