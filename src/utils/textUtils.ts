/**
 * Utilitki do pracy z tekstem
 */

/**
 * Mapa polskich znaków na znaki standardowe
 */
const POLISH_CHARS_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
  Ą: 'A',
  Ć: 'C',
  Ę: 'E',
  Ł: 'L',
  Ń: 'N',
  Ó: 'O',
  Ś: 'S',
  Ź: 'Z',
  Ż: 'Z',
} as const;

/**
 * Normalizuje tekst - zamienia polskie znaki na standardowe,
 * usuwa nadmiarowe spacje i znaki interpunkcyjne
 * @param text - tekst do znormalizowania
 * @returns znormalizowany tekst
 */
export const normalizeText = (text: string | null | undefined): string => {
  if (!text || typeof text !== 'string') return '';

  return text
    .split('')
    .map((char) => POLISH_CHARS_MAP[char] || char)
    .join('')
    .toLowerCase()
    .replaceAll(/[^\w\s]/gi, '') // usuń znaki interpunkcyjne
    .replaceAll(/\s+/g, ' ') // zamień wielokrotne spacje na pojedynczą
    .trim(); // usuń spacje na początku i końcu
};

/**
 * Sprawdza czy query pasuje do tekstu z użyciem normalizacji
 * @param text - tekst do przeszukania
 * @param query - zapytanie wyszukiwania
 * @returns true jeśli query pasuje do tekstu
 */
export const matchesSearchQuery = (text: string | null | undefined, query: string | null | undefined): boolean => {
  if (!query || typeof query !== 'string') return true;
  if (!text || typeof text !== 'string') return false;

  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);

  return normalizedText.includes(normalizedQuery);
};

/**
 * Sprawdza czy query pasuje do któregokolwiek z podanych tekstów
 * @param texts - tablica tekstów do przeszukania
 * @param query - zapytanie wyszukiwania
 * @returns true jeśli query pasuje do któregokolwiek tekstu
 */
export const matchesAnyText = (
  texts: readonly (string | undefined | null)[],
  query: string | null | undefined
): boolean => {
  if (!query || typeof query !== 'string') return true;
  if (!texts || texts.length === 0) return false;

  return texts.some((text) => text && matchesSearchQuery(text, query));
};

/**
 * Paleta gradientów dla avatarów pacjentów
 * Każdy gradient ma przyjemne kolory pasujące do dark theme
 */
const AVATAR_GRADIENTS = [
  { from: '#22c55e', to: '#10b981' }, // green
  { from: '#3b82f6', to: '#6366f1' }, // blue-indigo
  { from: '#8b5cf6', to: '#a855f7' }, // violet-purple
  { from: '#ec4899', to: '#f43f5e' }, // pink-rose
  { from: '#f97316', to: '#eab308' }, // orange-yellow
  { from: '#14b8a6', to: '#06b6d4' }, // teal-cyan
  { from: '#6366f1', to: '#8b5cf6' }, // indigo-violet
  { from: '#ef4444', to: '#f97316' }, // red-orange
  { from: '#10b981', to: '#14b8a6' }, // emerald-teal
  { from: '#a855f7', to: '#ec4899' }, // purple-pink
] as const;

/**
 * Generuje prosty hash z tekstu (djb2 algorithm)
 */
const simpleHash = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

/**
 * Generuje gradient CSS dla avatara na podstawie inicjałów (pierwszych liter)
 * Stabilny - zmienia się tylko gdy zmieniają się pierwsze litery imienia/nazwiska
 *
 * @param firstName - imię
 * @param lastName - nazwisko (opcjonalne)
 * @returns string z CSS gradient (np. "linear-gradient(135deg, #22c55e, #10b981)")
 *
 * @example
 * getAvatarGradient('Jan', 'Kowalski') // => "linear-gradient(135deg, #3b82f6, #6366f1)"
 * getAvatarGradient('', '') // => domyślny gradient
 */
export const getAvatarGradient = (
  firstName: string | null | undefined,
  lastName?: string | null | undefined
): string => {
  // Use only first letters for stable gradient (no "disco" effect)
  const firstInitial = (firstName || '').trim()[0]?.toLowerCase() || '';
  const lastInitial = (lastName || '').trim()[0]?.toLowerCase() || '';
  const key = `${firstInitial}${lastInitial}`;

  const index = key ? simpleHash(key) % AVATAR_GRADIENTS.length : 0;
  const gradient = AVATAR_GRADIENTS[index];
  return `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`;
};

/**
 * Generuje inicjały z imienia i nazwiska
 *
 * @param firstName - imię
 * @param lastName - nazwisko
 * @returns 1-2 znakowe inicjały (wielkie litery)
 *
 * @example
 * getInitials('Jan', 'Kowalski') // => "JK"
 * getInitials('Anna', '') // => "A"
 * getInitials('', '') // => "?"
 */
export const getInitials = (firstName: string | null | undefined, lastName: string | null | undefined): string => {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();

  if (!first && !last) return '?';

  const firstInitial = first[0]?.toUpperCase() || '';
  const lastInitial = last[0]?.toUpperCase() || '';

  return `${firstInitial}${lastInitial}` || '?';
};

/**
 * Typy słów dla polskiej odmiany liczebników
 */
export type PluralWord =
  | 'pacjent'
  | 'ćwiczenie'
  | 'zestaw'
  | 'dzień'
  | 'gabinet'
  | 'fizjoterapeuta'
  | 'notatka'
  | 'terapeuta';

/**
 * Słownik polskich form odmiany:
 * [forma pojedyncza (1), forma dla 2-4, forma dla 5+]
 */
const PLURAL_FORMS: Record<PluralWord, [string, string, string]> = {
  pacjent: ['pacjent', 'pacjentów', 'pacjentów'],
  ćwiczenie: ['ćwiczenie', 'ćwiczenia', 'ćwiczeń'],
  zestaw: ['zestaw', 'zestawy', 'zestawów'],
  dzień: ['dzień', 'dni', 'dni'],
  gabinet: ['gabinet', 'gabinety', 'gabinetów'],
  fizjoterapeuta: ['fizjoterapeuta', 'fizjoterapeutów', 'fizjoterapeutów'],
  notatka: ['notatka', 'notatki', 'notatek'],
  terapeuta: ['terapeuta', 'terapeutów', 'terapeutów'],
};

/**
 * Zwraca poprawną polską formę słowa dla danej liczby.
 *
 * Polska odmiana liczebników:
 * - 1 → forma pojedyncza (pacjent, ćwiczenie)
 * - 2-4, 22-24, 32-34... → forma dla kilku (pacjentów, ćwiczenia)
 * - 0, 5-21, 25-31... → forma dla wielu (pacjentów, ćwiczeń)
 *
 * @param count - liczba
 * @param word - słowo do odmiany
 * @param includeCount - czy dołączyć liczbę (domyślnie true)
 * @returns odmienione słowo z lub bez liczby
 *
 * @example
 * pluralize(1, 'pacjent') // => "1 pacjent"
 * pluralize(2, 'pacjent') // => "2 pacjentów"
 * pluralize(5, 'pacjent') // => "5 pacjentów"
 * pluralize(1, 'ćwiczenie') // => "1 ćwiczenie"
 * pluralize(3, 'ćwiczenie') // => "3 ćwiczenia"
 * pluralize(5, 'ćwiczenie') // => "5 ćwiczeń"
 * pluralize(5, 'ćwiczenie', false) // => "ćwiczeń"
 */
export const pluralize = (count: number | null | undefined, word: PluralWord, includeCount: boolean = true): string => {
  const n = count ?? 0;
  const forms = PLURAL_FORMS[word];

  const lastDigit = Math.abs(n) % 10;
  const lastTwoDigits = Math.abs(n) % 100;

  let form: string;

  if (n === 1) {
    // Dokładnie 1 → forma pojedyncza
    form = forms[0];
  } else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    // 2-4, 22-24, 32-34... (ale nie 12-14)
    form = forms[1];
  } else {
    // 0, 5-21, 25-31...
    form = forms[2];
  }

  return includeCount ? `${n} ${form}` : form;
};
