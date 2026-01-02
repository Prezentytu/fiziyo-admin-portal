import { Font } from '@react-pdf/renderer';

/**
 * Rejestracja fontów z pełnym wsparciem polskich znaków
 * Używamy Open Sans z Google Fonts (CDN)
 */
export function registerPolishFonts() {
  // Open Sans - font z pełnym wsparciem Unicode (w tym polskie znaki)
  Font.register({
    family: 'OpenSans',
    fonts: [
      {
        src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf',
        fontWeight: 'normal',
      },
      {
        src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf',
        fontWeight: 'semibold',
      },
      {
        src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf',
        fontWeight: 'bold',
      },
      {
        src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-italic.ttf',
        fontStyle: 'italic',
      },
    ],
  });

  // Wyłącz hyphenation (dzielenie wyrazów) - może powodować problemy z polskimi słowami
  Font.registerHyphenationCallback((word) => [word]);
}

// Automatycznie rejestruj fonty przy imporcie
registerPolishFonts();


