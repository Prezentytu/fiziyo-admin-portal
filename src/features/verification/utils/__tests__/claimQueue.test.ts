import { describe, expect, it } from 'vitest';
import { assignResultMessage, claimResultMessage } from '../claimQueue';

const me = { isMe: true, fullname: 'Adam Jasiński' };
const colleague = { isMe: false, fullname: 'Jan Kowalski' };

describe('claimResultMessage', () => {
  it('pełna porcja mówi, ile i komu', () => {
    expect(claimResultMessage(10, 10, me)).toEqual({ tone: 'success', text: 'Przydzielono 10 ćwiczeń: Tobie.' });
    expect(claimResultMessage(22, 22, colleague)).toEqual({
      tone: 'success',
      text: 'Przydzielono 22 ćwiczenia: Jan Kowalski.',
    });
  });

  it('mniej niż proszono mówi, że wolnych zabrakło', () => {
    expect(claimResultMessage(1, 25, colleague)).toEqual({
      tone: 'info',
      text: 'Przydzielono 1 ćwiczenie: Jan Kowalski. Więcej wolnych nie było.',
    });
  });

  it('nic do przydzielenia', () => {
    expect(claimResultMessage(0, 10, me)).toEqual({ tone: 'info', text: 'Nie ma już wolnych ćwiczeń w tej kolejce.' });
  });
});

describe('assignResultMessage', () => {
  it('wszystkie przydzielone: bez propozycji przejęcia', () => {
    expect(assignResultMessage(5, 0, colleague)).toEqual({
      tone: 'success',
      text: 'Przydzielono 5 ćwiczeń: Jan Kowalski.',
      offerTakeOver: false,
    });
  });

  it('cudze pominięte: ostrzeżenie i propozycja przejęcia, także przy zdejmowaniu', () => {
    expect(assignResultMessage(3, 2, me)).toEqual({
      tone: 'warning',
      text: 'Przydzielono 3 ćwiczenia: Tobie. 2 ćwiczenia ma ktoś inny.',
      offerTakeOver: true,
    });
    expect(assignResultMessage(0, 1, null)).toEqual({
      tone: 'warning',
      text: 'Zdjęto przydział: 0. 1 ćwiczenie ma ktoś inny.',
      offerTakeOver: true,
    });
  });
});
