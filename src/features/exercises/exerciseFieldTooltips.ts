import { EXERCISE_FIELD_METADATA } from '@/features/assignment/exerciseFieldMetadata';

export const EXERCISE_FIELD_TOOLTIPS = {
  patientDescription: EXERCISE_FIELD_METADATA.patientDescription.tooltip,
  clinicalDescription: EXERCISE_FIELD_METADATA.clinicalDescription.tooltip,
  exerciseSide: EXERCISE_FIELD_METADATA.side.tooltip,
  sets: EXERCISE_FIELD_METADATA.sets.tooltip,
  reps: EXERCISE_FIELD_METADATA.reps.tooltip,
  duration: EXERCISE_FIELD_METADATA.duration.tooltip,
  restSets: EXERCISE_FIELD_METADATA.restSets.tooltip,
  restReps: EXERCISE_FIELD_METADATA.restReps.tooltip,
  preparationTime: EXERCISE_FIELD_METADATA.preparationTime.tooltip,
  executionTime: EXERCISE_FIELD_METADATA.executionTime.tooltip,
  tempo: EXERCISE_FIELD_METADATA.tempo.tooltip,
  rangeOfMotion: EXERCISE_FIELD_METADATA.rangeOfMotion.tooltip,
  notes: EXERCISE_FIELD_METADATA.notes.tooltip,
  audioCue: EXERCISE_FIELD_METADATA.audioCue.tooltip,
  videoUrl: 'Link do filmu instruktażowego. Wklej pełny URL do materiału, który pacjent może odtworzyć.',
  load: EXERCISE_FIELD_METADATA.load.tooltip,
} as const;

