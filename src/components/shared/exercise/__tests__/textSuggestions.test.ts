import { describe, expect, it } from 'vitest';
import {
  applyTextSuggestion,
  isTextSuggestionActive,
  suggestionTestIdSlug,
} from '../textSuggestions';

describe('textSuggestions', () => {
  it('replace: ustawia wartość, a ponowny klik czyści', () => {
    expect(applyTextSuggestion('', 'Średni', 'replace')).toBe('Średni');
    expect(applyTextSuggestion('Lekki', 'Średni', 'replace')).toBe('Średni');
    expect(applyTextSuggestion(' średni ', 'Średni', 'replace')).toBe('');
    expect(isTextSuggestionActive('średni', 'Średni', 'replace')).toBe(true);
  });

  it('append: przełącza pozycję listy po przecinku i zachowuje tekst własny', () => {
    expect(applyTextSuggestion('', 'Guma', 'append')).toBe('Guma');
    expect(applyTextSuggestion('czerwona taśma', 'Krzesło', 'append')).toBe('czerwona taśma, Krzesło');
    expect(applyTextSuggestion('Guma, krzesło', 'Krzesło', 'append')).toBe('Guma');
    expect(isTextSuggestionActive('Guma, krzesło', 'Krzesło', 'append')).toBe(true);
    expect(isTextSuggestionActive('Gumowa piłka', 'Guma', 'append')).toBe(false);
  });

  it('slug testid bez polskich znaków', () => {
    expect(suggestionTestIdSlug('Bardzo mocny')).toBe('bardzo-mocny');
    expect(suggestionTestIdSlug('Ręcznik')).toBe('recznik');
    expect(suggestionTestIdSlug('Krzesło')).toBe('krzeslo');
  });
});
