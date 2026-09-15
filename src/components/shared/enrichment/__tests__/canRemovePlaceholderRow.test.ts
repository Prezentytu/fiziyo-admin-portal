import { describe, expect, it } from 'vitest';

import {
  canRemovePlaceholderRow,
  isBlankText,
  isMistakeRowEmpty,
} from '../canRemovePlaceholderRow';

describe('canRemovePlaceholderRow', () => {
  const isEmpty = (value: string) => isBlankText(value);

  it('blokuje kosz przy jedynym pustym wierszu', () => {
    expect(canRemovePlaceholderRow([''], 0, isEmpty)).toBe(false);
    expect(canRemovePlaceholderRow(['   '], 0, isEmpty)).toBe(false);
  });

  it('pozwala usunąć jedyny wiersz, gdy ma treść', () => {
    expect(canRemovePlaceholderRow(['Kolano ucieka'], 0, isEmpty)).toBe(true);
  });

  it('pozwala usunąć pusty wiersz, gdy jest więcej niż jeden', () => {
    expect(canRemovePlaceholderRow(['', 'Drugi'], 0, isEmpty)).toBe(true);
    expect(canRemovePlaceholderRow(['Treść', ''], 1, isEmpty)).toBe(true);
  });

  it('odrzuca indeks poza zakresem', () => {
    expect(canRemovePlaceholderRow(['a'], -1, isEmpty)).toBe(false);
    expect(canRemovePlaceholderRow(['a'], 1, isEmpty)).toBe(false);
  });
});

describe('isMistakeRowEmpty', () => {
  it('traktuje placeholdery Błąd/Jak poprawić jako puste', () => {
    expect(isMistakeRowEmpty({ mistake: '', fix: '' })).toBe(true);
    expect(isMistakeRowEmpty({ mistake: '  ', fix: null })).toBe(true);
  });

  it('wymaga treści w błędzie albo korekcie', () => {
    expect(isMistakeRowEmpty({ mistake: 'Przeprost', fix: '' })).toBe(false);
    expect(isMistakeRowEmpty({ mistake: '', fix: 'Ugnij kolano' })).toBe(false);
  });
});
