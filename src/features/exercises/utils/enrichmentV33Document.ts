/**
 * Pomocniki formularza ćwiczenia w kontrakcie v3.3 (SPEC-038): limit uwag, „Uzupełnij przez AI”, panel JSON.
 *
 * Sam zapis dokumentu (lista ścieżek edytowalnych, budowa z dokumentu wczytanego, ochrona przed nadpisaniem)
 * żyje w jednym miejscu dla formularza i weryfikacji: `@/components/shared/exercise/writeExerciseContent`.
 */
import { readExerciseContent } from '@/components/shared/exercise/readExerciseContent';
import { parseEnrichmentJson } from '@/features/verification/utils/enrichment';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import type { ExerciseEnrichmentData, ExerciseEnrichmentPatientV3 } from '@/graphql/types/exerciseEnrichment.types';

import { deepMergeFillGaps } from './enrichmentFillGaps';

export const THERAPIST_NOTE_MAX_LENGTH = 600;

/**
 * Tekst, który pole uwag przyjmuje po wpisaniu albo wklejeniu. Powyżej limitu dopisać się nie da;
 * za długi tekst zapisany wcześniej wolno skracać.
 */
export function acceptTherapistNoteInput(current: string, next: string): string {
  if (next.length <= THERAPIST_NOTE_MAX_LENGTH || next.length < current.length) return next;
  return current.length > THERAPIST_NOTE_MAX_LENGTH ? current : next.slice(0, THERAPIST_NOTE_MAX_LENGTH);
}

// ---------- „Uzupełnij przez AI” ----------

/** Z odpowiedzi generatora zostają tylko pola, które w 3.3 leżą dokładnie w tym samym miejscu. */
export function pickV33AiFill(aiData: ExerciseEnrichmentData | null | undefined): ExerciseEnrichmentData {
  const normalized = toV3(aiData);
  const source = normalized.patient ?? {};
  const patient: ExerciseEnrichmentPatientV3 = {};
  if (source.summary) patient.summary = source.summary;
  if (source.steps?.length) patient.steps = source.steps;
  if (source.cues?.length) patient.cues = source.cues;
  if (source.mistakes?.length) patient.mistakes = source.mistakes;
  if (source.why) patient.why = source.why;
  if (source.when_to_do) patient.when_to_do = source.when_to_do;
  if (source.should_feel) patient.should_feel = source.should_feel;
  if (source.should_not_feel) patient.should_not_feel = source.should_not_feel;

  const stopIf = normalized.safety?.stop_if;
  return {
    ...(Object.keys(patient).length > 0 ? { patient } : {}),
    ...(stopIf ? { safety: { stop_if: stopIf } } : {}),
  };
}

/** Propozycja AI wypełnia tylko puste pola 3.3; reszta szkicu zostaje nietknięta. */
export function mergeV33AiFill(
  current: ExerciseEnrichmentData,
  aiData: ExerciseEnrichmentData | null | undefined
): ExerciseEnrichmentData {
  return deepMergeFillGaps(current, pickV33AiFill(aiData)) as ExerciseEnrichmentData;
}

/** Ile z sekcji, które AI umie uzupełnić w rekordzie 3.3, ma już treść. */
export function countV33AiFillSections(data: ExerciseEnrichmentData): { filled: number; total: number } {
  const content = readExerciseContent({ enrichmentData: data });
  const sections = [
    content.instruction.summary !== null,
    content.instruction.steps.length > 0,
    content.cues.length > 0,
    content.mistakes.length > 0,
    content.shouldFeel !== null && content.shouldNotFeel !== null,
    content.why !== null && content.whenToDo !== null,
    content.stopIf !== null,
  ];
  return { filled: sections.filter(Boolean).length, total: sections.length };
}

// ---------- Panel „Zaawansowane (JSON)” ----------

/** Odrzuca wklejony dokument, który zgubił wersję: taki rekord czytałby się potem jak stary. */
export function parseV33JsonDocument(rawJson: string): ExerciseEnrichmentData {
  const parsed = parseEnrichmentJson(rawJson);
  if (readExerciseContent({ enrichmentData: parsed }).version !== '3.3') {
    throw new Error(
      'Dokument musi zachować pole „schemaVersion” (3.3 lub wyżej). Bez niego ćwiczenie wróciłoby do starego kształtu.'
    );
  }
  return parsed;
}
