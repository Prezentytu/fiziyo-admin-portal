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

function readSchemaVersion(source: ExerciseRecordVersionSource): string | null {
  const { schemaVersion, enrichmentData } = source as { schemaVersion?: unknown; enrichmentData?: unknown };
  const document = parseDocument(enrichmentData);
  for (const candidate of [schemaVersion, document?.schemaVersion]) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate.trim();
  }
  return null;
}

export function isV33ExerciseRecord(source: ExerciseRecordVersionSource | null | undefined): boolean {
  const match = source ? readSchemaVersion(source)?.match(/^(\d+)(?:\.(\d+))?/) : null;
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2] ?? 0);
  return major > 3 || (major === 3 && minor >= 3);
}
