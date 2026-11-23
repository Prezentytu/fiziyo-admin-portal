import { describe, expect, it } from 'vitest';
import { claimResultMessage } from '../claimQueue';

describe('claimResultMessage', () => {
  it('pełna porcja to sukces z końcem kolejki', () => {
    expect(claimResultMessage(10, 10, 'NEWEST')).toEqual({
      tone: 'success',
      text: 'Wzięto 10 ćwiczeń od najnowszych.',
    });
    expect(claimResultMessage(22, 22, 'OLDEST')).toEqual({
      tone: 'success',
      text: 'Wzięto 22 ćwiczenia od najstarszych.',
    });
  });

  it('mniej niż proszono mówi, że wolnych zabrakło', () => {
    expect(claimResultMessage(1, 25, 'OLDEST')).toEqual({
      tone: 'info',
      text: 'Wzięto 1 ćwiczenie od najstarszych. Więcej wolnych nie było.',
    });
  });

  it('nic do wzięcia', () => {
    expect(claimResultMessage(0, 10, 'NEWEST')).toEqual({
      tone: 'info',
      text: 'Nie ma już wolnych ćwiczeń w tej kolejce.',
    });
  });
});
