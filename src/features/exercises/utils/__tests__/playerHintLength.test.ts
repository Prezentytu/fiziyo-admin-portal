import { describe, expect, it } from 'vitest';

import {
  getDescriptionPlayerHints,
  getLongestPlayerHint,
  getPlayerHintLength,
  getPlayerHints,
  isShownInPlayer,
  PLAYER_HINT_MAX_CHARS,
} from '../playerHintLength';

describe('getPlayerHintLength', () => {
  it('nie ocenia pustej wskazówki', () => {
    expect(getPlayerHintLength('   ').status).toBe('empty');
    expect(getPlayerHintLength(undefined).status).toBe('empty');
  });

  it('wskazówka równa limitowi mieści się w playerze, o znak dłuższa już nie', () => {
    expect(getPlayerHintLength('a'.repeat(PLAYER_HINT_MAX_CHARS))).toEqual({
      length: PLAYER_HINT_MAX_CHARS,
      max: PLAYER_HINT_MAX_CHARS,
      status: 'fits',
    });
    expect(getPlayerHintLength('a'.repeat(PLAYER_HINT_MAX_CHARS + 1)).status).toBe('too-long');
  });

  it('nie liczy spacji na brzegach, jak player przy trim()', () => {
    expect(getPlayerHintLength(`  ${'a'.repeat(PLAYER_HINT_MAX_CHARS)}  \n`).status).toBe('fits');
  });
});

describe('getDescriptionPlayerHints', () => {
  it('zwraca pusto, gdy ćwiczenie ma kroki, bo player wtedy nie bierze opisu', () => {
    expect(getDescriptionPlayerHints('Długi opis', ['Usiądź prosto'])).toEqual([]);
  });

  it('bez kroków bierze dwie pierwsze linie opisu bez numeracji', () => {
    expect(getDescriptionPlayerHints('1. Usiądź\n\n2) Wyprostuj plecy\n3- Oddychaj', ['  '])).toEqual([
      'Usiądź',
      'Wyprostuj plecy',
    ]);
  });

  it('bez opisu nie ma czego pokazać', () => {
    expect(getDescriptionPlayerHints('  ', null)).toEqual([]);
  });
});

describe('getLongestPlayerHint', () => {
  it('wybiera najdłuższą linię, żeby jeden licznik ostrzegał za wszystkie', () => {
    expect(getLongestPlayerHint(['krótka', 'zdecydowanie dłuższa'])).toBe('zdecydowanie dłuższa');
    expect(getLongestPlayerHint([])).toBe('');
  });
});

describe('isShownInPlayer', () => {
  it('player pokazuje tylko 2 pierwsze kroki', () => {
    const steps = ['Usiądź', 'Wyprostuj plecy', 'Oddychaj'];

    expect(steps.map((_step, index) => isShownInPlayer(steps, index, 'step'))).toEqual([true, true, false]);
  });

  it('player pokazuje 4 pierwsze wskazówki, puste wiersze nie zajmują miejsca', () => {
    const cues = ['A', '  ', 'B', 'C', 'D', 'E'];

    expect(cues.map((_cue, index) => isShownInPlayer(cues, index, 'cue'))).toEqual([
      true,
      false,
      true,
      true,
      true,
      false,
    ]);
  });
});

describe('getPlayerHints', () => {
  it('bierze tyle niepustych pozycji, ile pokaże player', () => {
    expect(getPlayerHints(['', ' Krok 1 ', 'Krok 2', 'Krok 3'], 'step')).toEqual(['Krok 1', 'Krok 2']);
  });
});
