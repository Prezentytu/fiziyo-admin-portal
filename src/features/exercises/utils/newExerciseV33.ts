import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { ENRICHMENT_SCHEMA_V3 } from '@/features/verification/utils/enrichmentToV3';
import type { CreateExerciseDraft } from './buildCreateExerciseVariables';

/** Wersja dokumentu, w której portal tworzy nowe ćwiczenia (D-11: nowy rekord od razu w nowej schemie). */
export const NEW_EXERCISE_SCHEMA_VERSION = '3.3';

type PlainRecord = Record<string, unknown>;

function asRecord(value: unknown): PlainRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as PlainRecord) : null;
}

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function section(document: PlainRecord, key: string): PlainRecord {
  const existing = asRecord(document[key]);
  if (existing) return existing;
  const created: PlainRecord = {};
  document[key] = created;
  return created;
}

/**
 * Nowe ćwiczenie w kształcie v3.3: treść ze starych pól kreatora (opis dla pacjenta, opis kliniczny, polecenia
 * audio, sprzęt) przechodzi do dokumentu, gdy dokument nie ma jej już w nowym miejscu, a stare kolumny zostają puste.
 * Dokument dostaje `schemaVersion`, z którego backend wyprowadza kolumnę wersji. Duplikacja istniejącego rekordu
 * tu nie przechodzi: kopia zostaje w wersji źródła.
 */
export function toNewExerciseV33(
  draft: CreateExerciseDraft,
  enrichment: ExerciseEnrichmentData | null | undefined
): { draft: CreateExerciseDraft; document: ExerciseEnrichmentData } {
  const document: PlainRecord = structuredClone(asRecord(enrichment) ?? {});
  delete document.$schema;
  delete document.schemaVersion;

  const description = text(draft.patientDescription ?? draft.description);
  if (description) {
    const patient = section(document, 'patient');
    if (isEmpty(patient.summary)) patient.summary = description;
  }

  const clinical = text(draft.clinicalDescription);
  if (clinical) {
    const therapist = section(document, 'therapist');
    if (isEmpty(therapist.clinical_notes)) therapist.clinical_notes = clinical;
  }

  const audioCue = text(draft.audioCue);
  if (audioCue) {
    const patient = section(document, 'patient');
    if (isEmpty(patient.cues)) patient.cues = [audioCue];
  }

  const equipment = text(draft.equipment);
  if (equipment && isEmpty(document.equipment_items)) {
    // Bez dzielenia po przecinku: „hantel 2,5 kg” to jeden sprzęt.
    document.equipment_items = [{ label: equipment, qty: 1, required: true, substitutes: [] }];
  }

  return {
    draft: {
      ...draft,
      patientDescription: '',
      description: '',
      clinicalDescription: null,
      audioCue: null,
      equipment: null,
    },
    document: {
      $schema: ENRICHMENT_SCHEMA_V3,
      schemaVersion: NEW_EXERCISE_SCHEMA_VERSION,
      ...document,
    } as ExerciseEnrichmentData,
  };
}
