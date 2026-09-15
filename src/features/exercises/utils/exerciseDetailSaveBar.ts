export const MEDIA_PERSISTED_SAVE_HINT =
  'Zdjęcie zapisane od razu — nie wymaga przycisku Zapisz';

export type ExerciseDetailSaveBarKind = 'error' | 'dirty' | 'media-persisted' | 'saved';

export function resolveExerciseDetailSaveBarKind(params: {
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  isDirty: boolean;
  hasMediaPersistNotice: boolean;
}): ExerciseDetailSaveBarKind {
  if (params.saveStatus === 'error') return 'error';
  if (params.isDirty) return 'dirty';
  if (params.hasMediaPersistNotice) return 'media-persisted';
  return 'saved';
}
