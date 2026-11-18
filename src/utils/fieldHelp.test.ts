import { describe, expect, it } from 'vitest';

import { fieldHelpToText, toFieldHelp } from './fieldHelp';

describe('fieldHelpToText', () => {
  it('składa zdanie, punkty z hasłem i przykład w jeden tekst', () => {
    expect(
      fieldHelpToText({
        summary: 'Ile sekund trwa jedno powtórzenie.',
        points: [{ term: 'Puste pole', text: 'bez odliczania.' }, { text: 'Bez hasła.' }],
        example: 'wpisz 30.',
      })
    ).toBe('Ile sekund trwa jedno powtórzenie. Puste pole: bez odliczania. Bez hasła. Przykład: wpisz 30.');
  });

  it('przyjmuje zwykły tekst jako samo zdanie główne', () => {
    expect(toFieldHelp('Link do filmu.')).toEqual({ summary: 'Link do filmu.' });
    expect(fieldHelpToText('Link do filmu.')).toBe('Link do filmu.');
  });
});
