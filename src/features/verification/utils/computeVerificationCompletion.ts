import { HIDE_EXERCISE_TAGS } from '@/components/shared/exercise';

const MIN_PATIENT_DESCRIPTION_LENGTH = 50;
const MIN_CLINICAL_DESCRIPTION_LENGTH = 20;
const MIN_EXERCISE_NAME_LENGTH = 2;
const TOTAL_CRITICAL_CHECKS = 6;

export interface VerificationCompletionInput {
  name: string;
  patientDescription: string;
  clinicalDescription: string;
  sets: number | null;
  reps: number | null;
  executionTime: number | null;
  duration: number | null;
  hasMedia: boolean;
  mainTagsCount?: number;
}

export interface VerificationCompletion {
  /** Czy wszystkie kryteria krytyczne (wymagane do publikacji) są spełnione. */
  isValid: boolean;
  /** Etykiety brakujących pól krytycznych, do wyświetlenia w VerdictPanel. */
  missingFields: string[];
  /** Odsetek 0-100 spełnionych kryteriów krytycznych — karmi pasek gotowości w VerdictPanel. */
  percentage: number;
}

/**
 * Liczy gotowość ćwiczenia do publikacji na podstawie tych samych kryteriów krytycznych,
 * które wcześniej liczył `VerificationEditorPanel` (opis pacjenta/kliniczny, podstawowe parametry, nazwa, media, tagi).
 * Czysta funkcja — łatwa do przetestowania i reużycia we wszystkich trzech widokach weryfikacji.
 */
export function computeVerificationCompletion(input: VerificationCompletionInput): VerificationCompletion {
  const patientDescLength = input.patientDescription.trim().length;
  const clinicalDescLength = input.clinicalDescription.trim().length;

  const isPatientDescValid = patientDescLength >= MIN_PATIENT_DESCRIPTION_LENGTH;
  const isClinicalDescValid = clinicalDescLength >= MIN_CLINICAL_DESCRIPTION_LENGTH;

  const hasSets = (input.sets ?? 0) > 0;
  const hasVolume = (input.reps ?? 0) > 0 || (input.executionTime ?? 0) > 0 || (input.duration ?? 0) > 0;
  const hasTags = HIDE_EXERCISE_TAGS ? true : (input.mainTagsCount ?? 0) > 0;
  const hasName = input.name.trim().length >= MIN_EXERCISE_NAME_LENGTH;

  const missingFields: string[] = [];
  if (!isPatientDescValid) missingFields.push(`Opis pacjenta (min. ${MIN_PATIENT_DESCRIPTION_LENGTH} znaków)`);
  if (!isClinicalDescValid) missingFields.push(`Opis kliniczny (min. ${MIN_CLINICAL_DESCRIPTION_LENGTH} znaków)`);
  if (!hasSets) missingFields.push('Liczba serii');
  if (!hasVolume) missingFields.push('Powtórzenia lub czas');
  if (!HIDE_EXERCISE_TAGS && !hasTags) missingFields.push('Tagi główne');
  if (!hasName) missingFields.push('Nazwa ćwiczenia');
  if (!input.hasMedia) missingFields.push('Media (wideo lub zdjęcie)');

  const filledCritical = TOTAL_CRITICAL_CHECKS - Math.min(missingFields.length, TOTAL_CRITICAL_CHECKS);
  const percentage = Math.round((filledCritical / TOTAL_CRITICAL_CHECKS) * 100);

  return {
    isValid: missingFields.length === 0,
    missingFields,
    percentage,
  };
}
