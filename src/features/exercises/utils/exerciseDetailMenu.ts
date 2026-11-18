export type ExerciseDetailMenuItem =
  'duplicate' | 'open-video' | 'submit-global' | 'submit-organization' | 'resubmit' | 'delete';

export interface ExerciseDetailMenuInput {
  /** Pozycja „Duplikuj” jest w menu (także wyłączona, gdy dostępność jeszcze nieznana). */
  showDuplicate: boolean;
  canOpenVideo: boolean;
  canSubmitToGlobal: boolean;
  canSubmitToOrganization: boolean;
  canResubmit: boolean;
  canDelete: boolean;
}

/**
 * Pozycje menu „Opcje” w grupach. Separator stoi tylko między grupami, pustych grup nie ma,
 * więc menu nie zaczyna się kreską, a puste menu to pusta lista (wtedy nie pokazujemy przycisku).
 */
export function resolveExerciseDetailMenuGroups(input: ExerciseDetailMenuInput): ExerciseDetailMenuItem[][] {
  const groups: ExerciseDetailMenuItem[][] = [
    [
      ...(input.showDuplicate ? (['duplicate'] as const) : []),
      ...(input.canOpenVideo ? (['open-video'] as const) : []),
    ],
    input.canSubmitToGlobal ? ['submit-global'] : [],
    input.canSubmitToOrganization ? ['submit-organization'] : [],
    input.canResubmit ? ['resubmit'] : [],
    input.canDelete ? ['delete'] : [],
  ];
  return groups.filter((group) => group.length > 0);
}

/**
 * „Usuń ćwiczenie” w menu. Ćwiczenie z bazy FiziYo usuwa tylko SiteAdmin i SiteSuperAdmin
 * (backend: `PermissionService.CanDeleteExercise`); ćwiczenie gabinetu rozstrzyga backend jak dotąd.
 */
export function canShowExerciseDelete(params: {
  scope: string | null | undefined;
  isSiteAdmin: boolean;
  isSiteSuperAdmin: boolean;
}): boolean {
  if (params.scope !== 'GLOBAL') return true;
  return params.isSiteAdmin || params.isSiteSuperAdmin;
}
