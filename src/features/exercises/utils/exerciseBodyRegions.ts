import type { ExerciseBodyRegion } from '@/types/apollo';

export interface ExerciseBodyRegionOption {
  /** Slug in the `region` URL param and in `data-testid`. */
  readonly id: string;
  readonly region: ExerciseBodyRegion;
  readonly label: string;
}

/**
 * Large body regions grouping the exercise library. The API resolves a region from exercise
 * names, aliases and tags (backend `ExerciseSearchVocabulary`), so the panel only names them.
 */
export const EXERCISE_BODY_REGIONS: readonly ExerciseBodyRegionOption[] = [
  { id: 'szyja', region: 'CERVICAL_SPINE', label: 'Kręgosłup szyjny' },
  { id: 'piersiowy', region: 'THORACIC_SPINE', label: 'Kręgosłup piersiowy' },
  { id: 'ledzwiowy', region: 'LUMBAR_SPINE', label: 'Kręgosłup lędźwiowy' },
  { id: 'bark', region: 'SHOULDER', label: 'Bark' },
  { id: 'lokiec-reka', region: 'ELBOW_HAND', label: 'Łokieć i ręka' },
  { id: 'biodro', region: 'HIP', label: 'Biodro' },
  { id: 'kolano', region: 'KNEE', label: 'Kolano' },
  { id: 'stopa', region: 'FOOT_ANKLE', label: 'Stopa i staw skokowy' },
  { id: 'oddech-rownowaga', region: 'BREATHING_BALANCE', label: 'Oddech i równowaga' },
];

export function findExerciseBodyRegion(id: string | null | undefined): ExerciseBodyRegionOption | null {
  return EXERCISE_BODY_REGIONS.find((option) => option.id === id) ?? null;
}
