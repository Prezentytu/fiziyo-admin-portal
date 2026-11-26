import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ComposerDraftContext } from '../../ComposerDraftContext';
import { ClarifyChips, ClarifyPendingBar, ClarifyRepickBar, useClarifyAnswers } from '../ClarifyChips';

const chat = vi.hoisted(() => ({ sendMessage: vi.fn(), busy: false }));
vi.mock('../../ChatSessionContext', () => ({
  useChatActions: () => ({ sendMessage: chat.sendMessage }),
  useChatBusy: () => chat.busy,
}));

const QUESTIONS = [
  { label: 'Jaki jest cel?', topic: 'Cel ćwiczeń', options: ['siła', 'rozciąganie', 'stabilizacja'], multi: true },
  { label: 'Które biodro?', topic: 'Strona ciała', options: ['lewe', 'prawe', 'oba'] },
];

function Harness({ request }: { readonly request?: string }) {
  const answers = useClarifyAnswers(QUESTIONS, request);
  return (
    <>
      <ClarifyChips answers={answers} info="Zaznacz odpowiedzi" testId="clarify" />
      <footer data-testid="footer">
        {answers.pending ? (
          <ClarifyPendingBar testId="clarify" />
        ) : answers.picked.length > 0 ? (
          <ClarifyRepickBar answers={answers} testId="clarify" />
        ) : (
          <button type="button" data-testid="card-primary-btn">
            Wybierz pacjenta
          </button>
        )}
      </footer>
    </>
  );
}

function renderChips(request?: string) {
  chat.sendMessage.mockReset();
  chat.busy = false;
  const draft = vi.fn();
  const view = render(
    <ComposerDraftContext.Provider value={draft}>
      <Harness request={request} />
    </ComposerDraftContext.Provider>
  );
  const option = (question: number, index: number) => screen.getByTestId(`clarify-${question}-option-${index}-btn`);
  const rerender = () =>
    view.rerender(
      <ComposerDraftContext.Provider value={draft}>
        <Harness request={request} />
      </ComposerDraftContext.Provider>
    );
  return { draft, option, rerender };
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

  // 26.11 (Przemek): po zaznaczeniu odpowiedzi ma być jedno kliknięcie do nowej propozycji, bez szukania „Wyślij”.
  it('po zaznaczeniu stopka staje się jednym paskiem decyzji, który od razu wysyła prośbę z odpowiedziami', () => {
    const { draft, option } = renderChips('Ułóż zestaw na biodro');
    expect(screen.queryByTestId('clarify-repick-btn')).toBeNull();
    expect(screen.getByTestId('card-primary-btn')).toBeTruthy();

    fireEvent.click(option(1, 0));
    fireEvent.click(option(0, 1));
    expect(screen.getByTestId('clarify-repick').textContent).toContain('rozciąganie · lewe');
    expect(screen.queryByTestId('card-primary-btn')).toBeNull();

    fireEvent.click(screen.getByTestId('clarify-repick-btn'));
    expect(chat.sendMessage).toHaveBeenCalledWith(
      'Ułóż zestaw na biodro\nCel ćwiczeń: rozciąganie\nStrona ciała: lewe'
    );
    expect(draft).toHaveBeenLastCalledWith('');
    expect(screen.queryByTestId('clarify-repick-btn')).toBeNull();
    expect(screen.getByTestId('clarify-pending')).toBeTruthy();
    expect(option(1, 0).getAttribute('aria-pressed')).toBe('false');
  });

  it('„Wyczyść” odznacza wszystko i nic nie wysyła', () => {
    const { draft, option } = renderChips();

    fireEvent.click(option(1, 2));
    fireEvent.click(screen.getByTestId('clarify-clear-btn'));

    expect(chat.sendMessage).not.toHaveBeenCalled();
    expect(draft).toHaveBeenLastCalledWith('');
    expect(option(1, 2).getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByTestId('clarify-repick')).toBeNull();
    expect(screen.getByTestId('card-primary-btn')).toBeTruthy();
  });

  it('w trakcie odpowiedzi asystenta przycisk jest wyłączony', () => {
    const { option } = renderChips();
    chat.busy = true;

    fireEvent.click(option(1, 1));
    expect(screen.getByTestId('clarify-repick-btn').hasAttribute('disabled')).toBe(true);
  });

  // 26.11 (Przemek): w trakcie dobierania karta pokazywała „Wybierz pacjenta”, choć za chwilę zostaje zastąpiona.
  it('od wysłania do końca odpowiedzi stopka pokazuje „Dobieram…”, bez akcji karty, a potem wraca', () => {
    const { option, rerender } = renderChips('Ułóż zestaw na biodro');
    chat.sendMessage.mockImplementation(() => {
      chat.busy = true;
    });

    fireEvent.click(option(1, 1));
    fireEvent.click(screen.getByTestId('clarify-repick-btn'));
    rerender();

    expect(screen.getByTestId('clarify-pending')).toBeTruthy();
    expect(screen.queryByTestId('card-primary-btn')).toBeNull();
    expect(option(0, 0).hasAttribute('disabled')).toBe(true);

    chat.busy = false;
    rerender();
    expect(screen.queryByTestId('clarify-pending')).toBeNull();
    expect(screen.getByTestId('card-primary-btn')).toBeTruthy();
  });

  // 26.11 (Przemek): opis działania panelu chowa się pod ⓘ przy tytule, panel to same pytania.
  it('opis działania jest pod ⓘ przy tytule, nie w treści panelu', () => {
    renderChips();

    expect(screen.getByTestId('clarify-info')).toBeTruthy();
    expect(screen.getByTestId('clarify').textContent).not.toContain('Zaznacz odpowiedzi');
  });
});

