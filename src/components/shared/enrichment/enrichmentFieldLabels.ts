/**
 * One name per exercise content field, shared by the exercise page, the editor and verification,
 * so a reviewer and a therapist talk about the same field.
 */
export const EXERCISE_CONTENT_LABELS = {
  clinicalDescription: 'Opis dla fizjoterapeuty',
  summary: 'Krótkie podsumowanie',
  shouldFeel: 'Co pacjent powinien czuć',
  shouldNotFeel: 'Czego nie powinien czuć',
  why: 'Dlaczego to ćwiczenie',
  whenToDo: 'Kiedy wykonywać',
  stopIf: 'Przerwij, gdy…',
  intensityGuide: 'Wskazówki dot. intensywności',
  clinicalNotes: 'Notatki dla fizjoterapeuty',
  indications: 'Wskazania',
  contraindications: 'Przeciwwskazania',
  rehabPhases: 'Faza rehabilitacji',
  clinicalBenefits: 'Korzyści terapeutyczne',
  progressionNotes: 'Notatki o progresji',
  equipment: 'Potrzebny sprzęt',
  problems: 'Problemy / dolegliwości',
  suitableFor: 'Odpowiednie dla',
  contraindicatedFor: 'Przeciwwskazane dla',
  keywords: 'Słowa kluczowe',
  audioCue: 'Polecenia audio',
  notes: 'Wskazówka fizjoterapeuty',
  easier: 'Jak wykonać łatwiej',
  harder: 'Jak wykonać trudniej',
  breathing: 'Oddech',
  checkpoints: 'Punkty kontrolne',
  therapistNote: 'Uwagi kliniczne',
  precautions: 'Ostrożności dla grup szczególnych',
} as const;

/** `safety.precautions` is a separate patient-facing block at the end of the exercise card. */
export const EXERCISE_PRECAUTIONS_HINT =
  'Pacjent zobaczy te zdania w osobnym bloku na końcu karty ćwiczenia, więc nie powtarzaj ich w krokach.';

/** `notes` reaches the patient plan as „Wskazówka fizjoterapeuty” in the mobile app. */
export const EXERCISE_NOTES_HINT = 'Pacjent może ją zobaczyć przy ćwiczeniu w aplikacji.';
