/**
 * Instrukcja ćwiczenia pokazywana albo drukowana pacjentowi poza stroną ćwiczenia:
 * wydruk PDF, podgląd w kreatorze przypisania, podgląd w planie pacjenta i w zestawie.
 *
 * Kolejność:
 * 1. nadpisanie opisu z pozycji planu albo przypisania (każdy widok rozstrzyga je po swojemu i podaje gotowe),
 * 2. rekord stary: opis z kolumny,
 * 3. gdy opisu nie ma, i zawsze dla rekordu 3.3: podsumowanie i ponumerowane kroki.
 * Brak instrukcji (`text: null`) znaczy, że rekord naprawdę nie ma żadnej z tych treści.
 */
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { printableInstructionLines, readExerciseContent, type ExerciseContentSource } from './readExerciseContent';

export type PatientInstructionSource = 'override' | 'description' | 'steps' | 'none';

export interface PatientInstructionInput {
  /** Nadpisanie opisu dla pacjenta, już rozstrzygnięte przez widok; puste nie jest nadpisaniem. */
  override?: string | null;
  /** Rekord ćwiczenia: kolumny opisu, wersja i dokument treści. */
  exercise?: Pick<ExerciseContentSource, 'patientDescription' | 'description' | 'schemaVersion' | 'enrichmentData'> | null;
  /**
   * Treść po nadpisaniach pozycji i przypisania (SPEC-024), gdy widok ją liczy: pacjent dostaje te kroki,
   * nie kroki szablonu. Bez niej czytamy dokument rekordu.
   */
  enrichment?: ExerciseEnrichmentData | null;
}

export interface PatientInstruction {
  /** Gotowy tekst; kroki w osobnych liniach. `null`, gdy nie ma żadnej instrukcji. */
  text: string | null;
  source: PatientInstructionSource;
}

export function resolvePatientInstruction({
  override,
  exercise,
  enrichment,
}: PatientInstructionInput): PatientInstruction {
  const overrideText = override?.trim();
  if (overrideText) return { text: overrideText, source: 'override' };

  const record = exercise ?? {};
  const content =
    enrichment == null
      ? readExerciseContent(record)
      : readExerciseContent({
          ...record,
          // Treść po nadpisaniach przechodzi przez `toV3`, które może zgubić znacznik wersji; wersję mówi rekord.
          schemaVersion: record.schemaVersion ?? readExerciseContent(record).schemaVersion,
          enrichmentData: enrichment,
        });

  if (content.instruction.description) return { text: content.instruction.description, source: 'description' };
  const lines = printableInstructionLines(content);
  return lines.length > 0 ? { text: lines.join('\n'), source: 'steps' } : { text: null, source: 'none' };
}
