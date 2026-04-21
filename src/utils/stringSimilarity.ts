/**
 * String similarity helpers oparte o Levenshtein distance.
 * Używane do lokalnego (bez AI) wykrywania literówek i podobnych nazw,
 * np. "hip trust" → "Hip Thrust" wykrywane jako podobne ćwiczenie.
 *
 * Wszystko działa offline w przeglądarce - nie zużywa kredytów AI.
 */

/**
 * Normalizacja tekstu pod fuzzy match:
 * - lowercase
 * - usunięcie diakrytyków (ą → a, ł → l)
 * - usunięcie znaków interpunkcji
 * - kompresja spacji
 */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll('ł', 'l')
    .replaceAll(/[^a-z0-9\s]/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance - minimalna liczba operacji (insert/delete/replace)
 * potrzebnych żeby zamienić string a w b.
 *
 * Przykłady:
 * - levenshtein("trust", "thrust") = 1 (wstawienie 'h')
 * - levenshtein("squat", "squad") = 1 (zamiana 't' na 'd')
 * - levenshtein("kot", "pies")    = 4
 *
 * Implementacja: dwurzędowa DP (O(n*m) czas, O(min(n,m)) pamięć).
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Zapewnij że b jest krótszy żeby mniej alokować
  if (a.length < b.length) {
    [a, b] = [b, a];
  }

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,        // insertion
        prev[j] + 1,             // deletion
        prev[j - 1] + cost       // substitution
      );
    }
    prev = [...curr];
  }

  return prev[b.length];
}

/**
 * Podobieństwo (0..1) - 1 = identyczne, 0 = całkowicie różne.
 * Bazuje na Levenshtein znormalizowanym przez długość dłuższego stringa.
 */
export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Czy dwa stringi to prawdopodobnie literówka tej samej rzeczy.
 *
 * Reguła: po normalizacji długości min. 4 znaki (krótsze są zbyt mylące),
 * Levenshtein <= 2 znaki różnicy ALBO similarity >= 0.78.
 *
 * Przykłady true:
 * - "trust" vs "thrust"   (distance 1)
 * - "squat" vs "squad"    (distance 1)
 * - "deadlift" vs "dedlift" (distance 1)
 * - "hip thrust" vs "hip trust" (distance 1)
 *
 * Przykłady false:
 * - "kot" vs "pies"
 * - "przysiad" vs "wykrok"
 */
export function isProbableTypo(a: string, b: string): boolean {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);

  if (na === nb) return false; // identyczne to nie literówka, to duplikat
  if (na.length < 4 || nb.length < 4) return false;

  const distance = levenshtein(na, nb);
  if (distance <= 2) return true;

  return similarity(na, nb) >= 0.78;
}

/**
 * Znajduje podobne stringi (literówki + bliskie nazwy) z listy kandydatów.
 * Zwraca posortowane od najbardziej podobnych, max `limit` wyników.
 * Threshold 0.6 = stosunkowo permisywne - dobrze łapie literówki.
 */
export function findSimilar<T>(
  query: string,
  candidates: T[],
  getText: (item: T) => string,
  options: { limit?: number; threshold?: number } = {}
): T[] {
  const { limit = 5, threshold = 0.6 } = options;
  const nq = normalizeForMatch(query);
  if (nq.length < 2) return [];

  const scored = candidates
    .map((item) => ({ item, score: similarity(nq, normalizeForMatch(getText(item))) }))
    .filter((entry) => entry.score >= threshold && entry.score < 1) // 1 = exact match, pomijamy
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((entry) => entry.item);
}
