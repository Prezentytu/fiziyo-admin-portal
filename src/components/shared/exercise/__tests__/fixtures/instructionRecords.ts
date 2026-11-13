import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import goldenV33 from './enrichmentV33.fx-0073.json';

/** Rekordy ćwiczeń do testów instrukcji dla pacjenta na wydruku i w podglądach. */

export const LEGACY_DESCRIPTION = 'Stań prosto.\n\nZrób przysiad.';

const legacyDocument: ExerciseEnrichmentData = {
  $schema: 'fiziyo-exercise-v3',
  patient: { summary: 'Przysiad do krzesła.', steps: ['Stań przed krzesłem.', 'Usiądź i wstań.'] },
};

export const LEGACY_STEPS_TEXT = 'Przysiad do krzesła.\n1. Stań przed krzesłem.\n2. Usiądź i wstań.';

export const legacyWithDescription = {
  id: 'ex-legacy',
  name: 'Przysiad',
  type: 'REPS',
  patientDescription: LEGACY_DESCRIPTION,
  enrichmentData: legacyDocument,
};

export const legacyStepsOnly = { id: 'ex-legacy-steps', name: 'Przysiad', type: 'REPS', enrichmentData: legacyDocument };

export const emptyExercise = { id: 'ex-empty', name: 'Przysiad', type: 'REPS', enrichmentData: null };

export const goldenV33Document = goldenV33 as ExerciseEnrichmentData;

/** Rekord 3.3 z paczki p001; kolumna opisu wypełniona celowo (rekord podniesiony mechanicznie). */
export const v33WithStaleColumn = {
  id: 'ex-v33',
  name: 'Izometria czworogłowego',
  type: 'REPS',
  patientDescription: 'STARY OPIS Z KOLUMNY',
  enrichmentData: goldenV33Document,
};

export const V33_STEPS_TEXT = [
  goldenV33Document.patient?.summary,
  ...(goldenV33Document.patient?.steps ?? []).map((step, index) => `${index + 1}. ${step}`),
].join('\n');
