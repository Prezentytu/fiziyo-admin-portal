/**
 * Czy rekord ćwiczenia jest zapisany w kontrakcie 3.3 albo późniejszym.
 *
 * To jest jedyna reguła portalu dla pytania „liczba powtórzeń przy stronach jest na stronę?” (KONTRAKT-v3.3 §6.7,
 * wariant B z 13.11): rekord 3.3 liczy „naprzemiennie” na stronę, rekord bez wersji albo starszy liczy łącznie jak dotąd.
 * Źródłem wersji jest kolumna `schemaVersion` (gdy backend ją doda) albo `enrichmentData.schemaVersion`;
 * dokument może przyjść jako obiekt albo tekst JSON. Ta sama semantyka co `readExerciseContent` ze stosu #220,
 * przy scaleniu ciało tej funkcji ma zostać zastąpione wywołaniem czytnika (`version === '3.3'`).
 */
/** Rekord ćwiczenia z API: czytamy z niego tylko `schemaVersion` i `enrichmentData`, więc przyjmujemy dowolny obiekt. */
export type ExerciseRecordVersionSource = object;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseDocument(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') return asRecord(value);
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

/**
 * Wersja rekordu tak jak ją czyta aplikacja (`selectExerciseReader`) i backend (`ExerciseSchemaVersion.ReadDeclared`):
 * tylko tekst (przycięty, najwyżej 16 znaków). Liczba (`3.3`) nie jest wersją i daje czytnik starego kształtu. Kolumna `schemaVersion` ma pierwszeństwo,
 * pusta albo brakująca oddaje głos dokumentowi.
 */
function readSchemaVersion(source: ExerciseRecordVersionSource): unknown {
  const { schemaVersion, enrichmentData } = source as { schemaVersion?: unknown; enrichmentData?: unknown };
  for (const candidate of [schemaVersion, parseDocument(enrichmentData)?.schemaVersion]) {
    if (candidate == null) continue;
    if (typeof candidate === 'string' && candidate.replace(EDGE_WHITESPACE, '') === '') continue;
    return candidate;
  }
  return null;
}

/**
 * Białe znaki przycinane jak w `string.Trim()` backendu (sprawdzone uruchomieniem `char.IsWhiteSpace` w .NET):
 * U+0009-000D, spacja, U+0085, U+00A0, U+1680, U+2000-200A, U+2028/2029, U+202F, U+205F, U+3000. Nie to samo co
 * JS `trim()`: tamten przycina jeszcze U+FEFF, a nie przycina U+0085.
 */
const EDGE_WHITESPACE = /^[\t-\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\t-\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g;

/** Ten sam wzorzec co `isValidVersion` w aplikacji i `AppVersion.IsValid` w backendzie. */
const VERSION_PATTERN = /^\d{1,5}(\.\d{1,5}){0,3}$/;
/** Długość kolumny `Exercise.SchemaVersion`; backend (`ExerciseSchemaVersion.MaxLength`) odrzuca dłuższy tekst po przycięciu. */
const MAX_VERSION_LENGTH = 16;
const FIRST_VERSION_WITH_PER_SIDE_DOSE = [3, 3];

export function isV33ExerciseRecord(source: ExerciseRecordVersionSource | null | undefined): boolean {
  const declared = source ? readSchemaVersion(source) : null;
  if (typeof declared !== 'string') return false;
  const version = declared.replace(EDGE_WHITESPACE, '');
  if (version.length > MAX_VERSION_LENGTH || !VERSION_PATTERN.test(version)) return false;
  const parts = version.split('.').map(Number);
  for (let index = 0; index < Math.max(parts.length, FIRST_VERSION_WITH_PER_SIDE_DOSE.length); index += 1) {
    const difference = (parts[index] ?? 0) - (FIRST_VERSION_WITH_PER_SIDE_DOSE[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}
