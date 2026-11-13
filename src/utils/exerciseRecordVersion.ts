/**
 * Czy rekord ćwiczenia jest zapisany w kontrakcie 3.3 albo późniejszym.
 *
 * Odpowiedź na pytanie „liczba powtórzeń przy stronach jest na stronę?” (KONTRAKT-v3.3 §6.7, wariant B z 13.11):
 * rekord 3.3 liczy „naprzemiennie” na stronę, rekord bez wersji albo starszy liczy łącznie jak dotąd.
 * Regułę wersji trzyma czytnik treści (`readExerciseSchemaVersion`), tu nie ma jej kopii.
 */
import { readExerciseSchemaVersion } from '@/components/shared/exercise/readExerciseContent';

/** Rekord ćwiczenia z API: czytamy z niego tylko `schemaVersion` i `enrichmentData`, więc przyjmujemy dowolny obiekt. */
export type ExerciseRecordVersionSource = object;

export function isV33ExerciseRecord(source: ExerciseRecordVersionSource | null | undefined): boolean {
  return readExerciseSchemaVersion(source) !== null;
}
