/**
 * Kliencki konwerter EnrichmentData v2 -> v3 (SPEC-022, fizjo-app).
 *
 * Wołany raz przy wczytaniu draftu w `useEnrichmentDraft`, dzięki czemu cały
 * edytor (sekcje, JSON raw, completeness) operuje wyłącznie na kształcie v3.
 * Idempotentny: jeśli wejście już ma `$schema === ENRICHMENT_SCHEMA_V3`,
 * zwraca głęboką kopię bez odczytywania pól v2.
 *
 * Mirror logiki backendowego `EnrichmentNormalizer` (fizjo-app,
 * backend/FizjoApp.Api/Services/EnrichmentNormalizer.cs) — patrz
 * docs/architecture/admin-enrichment-v3-migration-plan.md.
 */
import type {
  EnrichmentPatientMistakeV3,
  ExerciseEnrichmentAiV3,
  ExerciseEnrichmentData,
  ExerciseEnrichmentPatientV3,
  ExerciseEnrichmentTherapistV3,
} from '@/graphql/types/exerciseEnrichment.types';

export const ENRICHMENT_SCHEMA_V3 = 'fiziyo-exercise-v3';

function trimmedOrUndefined(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function trimmedStringArray(values: Array<string | null | undefined> | null | undefined): string[] | undefined {
  if (!values) return undefined;
  const cleaned = values.map((value) => value?.trim() ?? '').filter((value) => value.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

function buildPatientV3(data: ExerciseEnrichmentData): ExerciseEnrichmentPatientV3 | undefined {
  const preExercise = data.patient_instruction?.pre_exercise;

  const summary =
    trimmedOrUndefined(data.patient?.summary) ??
    trimmedOrUndefined(preExercise?.quick_summary) ??
    trimmedOrUndefined(data.simplified_instruction);

  const steps =
    trimmedStringArray(data.patient?.steps) ??
    trimmedStringArray(preExercise?.instruction_steps?.map((step) => step.text));

  const cuesFromCoaching = data.therapist_notes?.coaching_cues?.map((cue) => cue.text) ?? [];
  const cuesFromReminders = data.patient_notes?.technique_reminders ?? [];
  const cues = trimmedStringArray(data.patient?.cues) ?? trimmedStringArray([...cuesFromCoaching, ...cuesFromReminders]);

  const mistakes: EnrichmentPatientMistakeV3[] | undefined =
    data.patient?.mistakes && data.patient.mistakes.length > 0
      ? data.patient.mistakes
      : data.common_mistakes && data.common_mistakes.length > 0
        ? data.common_mistakes.map((mistake) => ({ mistake: mistake.mistake, fix: mistake.fix }))
        : undefined;

  const shouldFeel = trimmedOrUndefined(data.patient?.should_feel) ?? trimmedOrUndefined(data.feel_description?.should_feel);
  const shouldNotFeel =
    trimmedOrUndefined(data.patient?.should_not_feel) ?? trimmedOrUndefined(data.feel_description?.should_not_feel);
  const why = trimmedOrUndefined(data.patient?.why) ?? trimmedOrUndefined(data.patient_notes?.why_this_exercise);
  const whenToDo = trimmedOrUndefined(data.patient?.when_to_do) ?? trimmedOrUndefined(data.patient_notes?.when_to_do);

  const patient: ExerciseEnrichmentPatientV3 = {
    ...(summary ? { summary } : {}),
    ...(steps ? { steps } : {}),
    ...(cues ? { cues } : {}),
    ...(mistakes ? { mistakes } : {}),
    ...(shouldFeel ? { should_feel: shouldFeel } : {}),
    ...(shouldNotFeel ? { should_not_feel: shouldNotFeel } : {}),
    ...(why ? { why } : {}),
    ...(whenToDo ? { when_to_do: whenToDo } : {}),
  };

  return Object.keys(patient).length > 0 ? patient : undefined;
}

function buildSafetyV3(data: ExerciseEnrichmentData): ExerciseEnrichmentData['safety'] | undefined {
  const stopIf = trimmedOrUndefined(data.safety?.stop_if) ?? trimmedOrUndefined(data.safety?.intensity_guide);
  const requiresSupervision = data.safety?.requires_supervision;

  const safety: NonNullable<ExerciseEnrichmentData['safety']> = {
    ...(stopIf ? { stop_if: stopIf } : {}),
    ...(requiresSupervision !== undefined ? { requires_supervision: requiresSupervision } : {}),
  };

  return Object.keys(safety).length > 0 ? safety : undefined;
}

function buildTherapistV3(data: ExerciseEnrichmentData): ExerciseEnrichmentTherapistV3 | undefined {
  const notes = data.therapist_notes;

  const clinicalNotes = trimmedOrUndefined(data.therapist?.clinical_notes) ?? trimmedOrUndefined(notes?.clinical_notes);
  const indications = trimmedStringArray(data.therapist?.indications) ?? trimmedStringArray(notes?.clinical_indications);
  const contraindications =
    trimmedStringArray(data.therapist?.contraindications) ?? trimmedStringArray(notes?.contraindications);
  const rehabPhases = trimmedStringArray(data.therapist?.rehab_phases) ?? trimmedStringArray(notes?.rehab_phase);
  const progressionNotes =
    trimmedOrUndefined(data.therapist?.progression_notes) ?? trimmedOrUndefined(notes?.progression_notes);
  const clinicalBenefits =
    trimmedStringArray(data.therapist?.clinical_benefits) ?? trimmedStringArray(notes?.clinical_benefits);

  const therapist: ExerciseEnrichmentTherapistV3 = {
    ...(clinicalNotes ? { clinical_notes: clinicalNotes } : {}),
    ...(indications ? { indications } : {}),
    ...(contraindications ? { contraindications } : {}),
    ...(rehabPhases ? { rehab_phases: rehabPhases } : {}),
    ...(progressionNotes ? { progression_notes: progressionNotes } : {}),
    ...(clinicalBenefits ? { clinical_benefits: clinicalBenefits } : {}),
  };

  return Object.keys(therapist).length > 0 ? therapist : undefined;
}

function buildAiV3(data: ExerciseEnrichmentData): ExerciseEnrichmentAiV3 | undefined {
  const keywords = trimmedStringArray(data.ai?.keywords) ?? trimmedStringArray(data.ai_metadata?.search_keywords);
  const problems = trimmedStringArray(data.ai?.problems);
  const suitableFor = trimmedStringArray(data.ai?.suitable_for);
  const contraindicatedFor = trimmedStringArray(data.ai?.contraindicated_for);

  const ai: ExerciseEnrichmentAiV3 = {
    ...(keywords ? { keywords } : {}),
    ...(problems ? { problems } : {}),
    ...(suitableFor ? { suitable_for: suitableFor } : {}),
    ...(contraindicatedFor ? { contraindicated_for: contraindicatedFor } : {}),
  };

  return Object.keys(ai).length > 0 ? ai : undefined;
}

/**
 * Konwertuje dowolny (v2, v3 lub mieszany) EnrichmentData do kanonicznego v3.
 * Zwraca wyłącznie pola v3 (`$schema`, `patient`, `safety`, `therapist`, `ai`, `equipment`) —
 * legacy pola v2 nie są przenoszone dalej, żeby edytor od tego momentu operował czysto na v3.
 */
export function toV3(data: ExerciseEnrichmentData | null | undefined): ExerciseEnrichmentData {
  if (!data) {
    return { $schema: ENRICHMENT_SCHEMA_V3 };
  }

  if (data.$schema === ENRICHMENT_SCHEMA_V3) {
    return structuredClone(data);
  }

  const equipment = trimmedStringArray(data.equipment);

  const result: ExerciseEnrichmentData = {
    $schema: ENRICHMENT_SCHEMA_V3,
    ...(buildPatientV3(data) ? { patient: buildPatientV3(data) } : {}),
    ...(buildSafetyV3(data) ? { safety: buildSafetyV3(data) } : {}),
    ...(buildTherapistV3(data) ? { therapist: buildTherapistV3(data) } : {}),
    ...(buildAiV3(data) ? { ai: buildAiV3(data) } : {}),
    ...(equipment ? { equipment } : {}),
  };

  return result;
}
