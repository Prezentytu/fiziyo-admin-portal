import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/**
 * Rekord 3.3 ze zgłoszenia 16.11.2026 (DEV, plan „Adrian 16.11 – przegląd 25 ćwiczeń”, `przem-fx-7001`),
 * skrócony do pól, które czytają podgląd i edycja w zestawie. Źródło: paczka `hep2go-reference/paczki/adr1`.
 * Stare kolumny treści są puste (D-11), sprzęt leży tylko w `equipment_items`.
 */
export const FX_7001_STEPS = [
  'Usiądź wysoko na krześle, stopy płasko na podłodze, barki rozluźnione.',
  'Przyciągnij brodę do mostka, jakby między brodą a mostkiem była deska. Jeśli broda nie sięga mostka, opuść ją najniżej, jak się da bez bólu.',
  'Przytrzymaj brodą tę deskę, żeby nie wypadła. Trzymaj tak przez całe ćwiczenie.',
  'Z wydechem obróć głowę w bok, w zakresie ustalonym przez fizjoterapeutę. Broda sunie po mostku. Ruszaj się wolno.',
  'Zatrzymaj się na chwilę w obrocie.',
  'Z wdechem wróć głową do środka, broda dalej przy mostku.',
  'W kolejnym powtórzeniu obróć głowę w drugą stronę.',
  'Po serii unieś głowę i rozluźnij szyję.',
];

export const FX_7001_BREATHING = 'Wydech przy obrocie, wdech przy powrocie do środka.';

const fx7001Document: ExerciseEnrichmentData = {
  $schema: 'fiziyo-exercise-v3',
  schemaVersion: '3.3',
  patient: {
    summary: 'Obracanie głowy na boki z brodą przyciągniętą do mostka, w siadzie.',
    steps: FX_7001_STEPS,
    cues: ['Broda sunie po mostku.', 'Obracaj tylko głowę, barki stoją.'],
    cue_phases: [
      { cue: 0, phase: 'work' },
      { cue: 1, phase: 'work' },
    ],
  },
  breathing: { pattern: null, text: FX_7001_BREATHING },
  side: { mode: 'alternating', per_side_dose: true, shown_in_media: 'left' },
  equipment_items: [{ code: 'chair', label: 'krzesło', qty: 1, required: true, substitutes: [] }],
} as ExerciseEnrichmentData;

export const fx7001Exercise = {
  id: 'przem-fx-7001',
  name: 'Obracanie głowy z brodą przyciągniętą do mostka – w siadzie',
  type: 'REPS',
  side: 'ALTERNATING',
  patientDescription: undefined,
  clinicalDescription: undefined,
  audioCue: undefined,
  equipment: null,
  difficultyLevel: 'EASY',
  tempo: 'wolno',
  rangeOfMotion: 'w wygodnym zakresie, bez ostrego bólu',
  defaultSets: 2,
  defaultReps: 8,
  defaultExecutionTime: 5,
  defaultRestBetweenSets: 30,
  defaultRestBetweenReps: 0,
  preparationTime: 10,
  enrichmentData: fx7001Document,
};

/** Pozycja planu z kolumnami jak w zgłoszeniu: przerwa między powtórzeniami zapisana jako 0. */
export const fx7001Mapping = {
  id: 'm-fx-7001',
  exerciseId: fx7001Exercise.id,
  sets: 2,
  reps: 8,
  executionTime: 5,
  restSets: 30,
  restReps: 0,
  preparationTime: 10,
  tempo: 'wolno',
  exercise: fx7001Exercise,
};
