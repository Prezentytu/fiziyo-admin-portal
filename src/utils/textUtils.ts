/**
 * Utilitki do pracy z tekstem
 */

/**
 * Mapa polskich znaków na znaki standardowe
 */
const POLISH_CHARS_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
  Ą: "A",
  Ć: "C",
  Ę: "E",
  Ł: "L",
  Ń: "N",
  Ó: "O",
  Ś: "S",
  Ź: "Z",
  Ż: "Z",
} as const;

/**
 * Normalizuje tekst - zamienia polskie znaki na standardowe,
 * usuwa nadmiarowe spacje i znaki interpunkcyjne
 * @param text - tekst do znormalizowania
 * @returns znormalizowany tekst
 */
export const normalizeText = (text: string | null | undefined): string => {
  if (!text || typeof text !== "string") return "";

  return text
    .split("")
    .map((char) => POLISH_CHARS_MAP[char] || char)
    .join("")
    .toLowerCase()
    .replaceAll(/[^\w\s]/gi, "") // usuń znaki interpunkcyjne
    .replaceAll(/\s+/g, " ") // zamień wielokrotne spacje na pojedynczą
    .trim(); // usuń spacje na początku i końcu
};

/**
 * Sprawdza czy query pasuje do tekstu z użyciem normalizacji
 * @param text - tekst do przeszukania
 * @param query - zapytanie wyszukiwania
 * @returns true jeśli query pasuje do tekstu
 */
export const matchesSearchQuery = (text: string | null | undefined, query: string | null | undefined): boolean => {
  if (!query || typeof query !== "string") return true;
  if (!text || typeof text !== "string") return false;

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
  query: string | null | undefined,
): boolean => {
  if (!query || typeof query !== "string") return true;
  if (!texts || texts.length === 0) return false;

  return texts.some((text) => text && matchesSearchQuery(text, query));
};

/**
 * Formatuje streak w stylu Duolingo PL / Apple Fitness
 * - Spójny label dla wszystkich wartości (wizualne rozróżnienie przez wyszarzenie)
 * - Poprawna polska odmiana: 1 dzień, 2+ dni
 *
 * @param streak - liczba dni streaka
 * @param variant - wariant wyświetlania
 *   - 'short': "dzień z rzędu" / "dni z rzędu" (tylko label, liczba osobno)
 *   - 'full': "1 dzień z rzędu" / "5 dni z rzędu" (z liczbą)
 * @returns sformatowany tekst
 */
export const formatStreakLabel = (streak: number | null | undefined, variant: "short" | "full" = "short"): string => {
  const value = streak ?? 0;

  // Polska odmiana: 1 = dzień, reszta = dni
  const label = value === 1 ? "dzień z rzędu" : "dni z rzędu";

  if (variant === "short") {
    return label;
  }

  // Pełny format z liczbą
  return `${value} ${label}`;
};

/**
 * Sprawdza czy streak jest aktywny (> 0)
 * Używane do warunkowego stylowania (np. kolor ikony)
 */
export const isStreakActive = (streak: number | null | undefined): boolean => {
  return (streak ?? 0) > 0;
};

/**
 * Formatuje liczbę punktów z poprawną polską odmianą
 * - 1 → "punkt"
 * - 2-4, 22-24, 32-34... → "punkty"
 * - 0, 5-21, 25-31... → "punktów"
 *
 * @param points - liczba punktów
 * @param variant - wariant wyświetlania
 *   - 'short': tylko label (np. "punktów")
 *   - 'full': z liczbą (np. "5 punktów")
 * @returns sformatowany tekst
 */
export const formatPointsLabel = (points: number | null | undefined, variant: "short" | "full" = "short"): string => {
  const value = points ?? 0;

  let label: string;
  const lastDigit = value % 10;
  const lastTwoDigits = value % 100;

  if (value === 1) {
    label = "punkt";
  } else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    label = "punkty";
  } else {
    label = "punktów";
  }

  if (variant === "short") {
    return label;
  }

  return `${value} ${label}`;
};

/**
 * Konwertuje kolor hex na RGB
 * @param hex - kolor w formacie hex (np. "#FFFF00" lub "FFFF00")
 * @returns obiekt z wartościami r, g, b lub null jeśli nieprawidłowy format
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  // Usuń # jeśli istnieje
  const cleanHex = hex.replace(/^#/, "");

  // Obsłuż skrócony format (np. "FFF" -> "FFFFFF")
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split("")
          .map((c) => c + c)
          .join("")
      : cleanHex;

  if (fullHex.length !== 6) return null;

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : null;
};

/**
 * Oblicza relative luminance koloru według WCAG 2.1
 * @param r - czerwony (0-255)
 * @param g - zielony (0-255)
 * @param b - niebieski (0-255)
 * @returns luminance (0-1)
 */
const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Zwraca odpowiedni kolor tekstu (ciemny/jasny) dla danego koloru tła
 * Używa algorytmu WCAG do zapewnienia odpowiedniego kontrastu
 *
 * @param backgroundColor - kolor tła w formacie hex (np. "#FFFF00")
 * @param lightColor - kolor dla ciemnych teł (domyślnie biały)
 * @param darkColor - kolor dla jasnych teł (domyślnie czarny)
 * @returns kolor tekstu zapewniający czytelność
 *
 * @example
 * getContrastTextColor('#FFFF00') // => '#1A1A1A' (ciemny na żółtym)
 * getContrastTextColor('#1A1A1A') // => '#FFFFFF' (biały na ciemnym)
 */
export const getContrastTextColor = (
  backgroundColor: string | undefined | null,
  lightColor: string = "#FFFFFF",
  darkColor: string = "#1A1A1A",
): string => {
  if (!backgroundColor) return lightColor;

  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return lightColor;

  const luminance = getRelativeLuminance(rgb.r, rgb.g, rgb.b);

  // Próg 0.179 zapewnia contrast ratio >= 4.5:1 (WCAG AA)
  return luminance > 0.179 ? darkColor : lightColor;
};
