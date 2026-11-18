import { describe, expect, it } from 'vitest';
import {
  EXERCISE_STEP_MAX_CHARS,
  getLongestText,
  getPlayerHintLength,
  PATIENT_TEXT_MAX_CHARS,
  PLAYER_HINT_MAX_CHARS,
} from '../playerHintLength';

describe('playerHintLength', () => {
  it('wskazówka równa limitowi mieści się w playerze, o znak dłuższa już nie', () => {
    expect(getPlayerHintLength('a'.repeat(PLAYER_HINT_MAX_CHARS))).toEqual({
      length: PLAYER_HINT_MAX_CHARS,
      max: PLAYER_HINT_MAX_CHARS,
      status: 'fits',
    });
    expect(getPlayerHintLength('a'.repeat(PLAYER_HINT_MAX_CHARS + 1)).status).toBe('too-long');
  });

  it('liczy znaki bez białych znaków na brzegach, a pusty tekst nie ma statusu długości', () => {
    expect(getPlayerHintLength(`  ${'a'.repeat(PLAYER_HINT_MAX_CHARS)}  \n`).status).toBe('fits');
    expect(getPlayerHintLength('   ').status).toBe('empty');
    expect(getPlayerHintLength(null).status).toBe('empty');
  });

  it('krok może być dłuższy niż wskazówka (T-0064): ten sam tekst mieści się jako krok, a jako wskazówka nie', () => {
    expect(EXERCISE_STEP_MAX_CHARS).toBeGreaterThan(PLAYER_HINT_MAX_CHARS);
    const text = 'a'.repeat(PLAYER_HINT_MAX_CHARS + 40);
    expect(getPlayerHintLength(text, PATIENT_TEXT_MAX_CHARS.step).status).toBe('fits');
    expect(getPlayerHintLength(text, PATIENT_TEXT_MAX_CHARS.cue).status).toBe('too-long');
    expect(getPlayerHintLength('a'.repeat(EXERCISE_STEP_MAX_CHARS + 1), PATIENT_TEXT_MAX_CHARS.step).status).toBe(
      'too-long'
    );
  });

  it('najdłuższy tekst z listy pomija puste pozycje i białe znaki', () => {
    expect(getLongestText(['  krótki  ', '', 'najdłuższy tekst', 'średni'])).toBe('najdłuższy tekst');
    expect(getLongestText([])).toBe('');
  });
});
