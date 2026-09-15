export function shouldRehydrateExerciseEditorDraft(params: {
  hasSource: boolean;
  hasHydrated: boolean;
  isDirty: boolean;
  isAutosave: boolean;
  sourceIdentity: string | null;
  hydratedIdentity: string | null;
}): boolean {
  if (!params.hasSource) return false;
  const identityChanged = params.sourceIdentity !== params.hydratedIdentity;
  if (identityChanged) return true;
  if (!params.hasHydrated) return true;
  if (params.isAutosave) return false;
  return !params.isDirty;
}
