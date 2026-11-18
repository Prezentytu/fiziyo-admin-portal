import { describe, expect, it } from 'vitest';

import { canShowExerciseDelete, resolveExerciseDetailMenuGroups } from '../exerciseDetailMenu';

const none = {
  showDuplicate: false,
  canOpenVideo: false,
  canSubmitToGlobal: false,
  canSubmitToOrganization: false,
  canResubmit: false,
  canDelete: false,
};

describe('resolveExerciseDetailMenuGroups', () => {
  it('ćwiczenie demo u terapeuty: brak pozycji, więc brak menu', () => {
    expect(resolveExerciseDetailMenuGroups(none)).toEqual([]);
  });

  it('ćwiczenie demo u administratora: samo „Usuń”, bez pustej grupy przed nim', () => {
    expect(resolveExerciseDetailMenuGroups({ ...none, canDelete: true })).toEqual([['delete']]);
  });

  it('ćwiczenie gabinetu: kopia i film razem, zgłoszenia i usuwanie w osobnych grupach', () => {
    expect(
      resolveExerciseDetailMenuGroups({
        showDuplicate: true,
        canOpenVideo: true,
        canSubmitToGlobal: true,
        canSubmitToOrganization: true,
        canResubmit: false,
        canDelete: true,
      })
    ).toEqual([['duplicate', 'open-video'], ['submit-global'], ['submit-organization'], ['delete']]);
  });

  it('ćwiczenie FiziYo u terapeuty: tylko „Duplikuj”', () => {
    expect(resolveExerciseDetailMenuGroups({ ...none, showDuplicate: true })).toEqual([['duplicate']]);
  });
});

describe('canShowExerciseDelete', () => {
  it('ćwiczenie gabinetu: pozycja jest, rozstrzyga backend', () => {
    expect(canShowExerciseDelete({ scope: 'ORGANIZATION', isSiteAdmin: false, isSiteSuperAdmin: false })).toBe(true);
  });

  it('ćwiczenie FiziYo: tylko administrator witryny', () => {
    expect(canShowExerciseDelete({ scope: 'GLOBAL', isSiteAdmin: false, isSiteSuperAdmin: false })).toBe(false);
    expect(canShowExerciseDelete({ scope: 'GLOBAL', isSiteAdmin: true, isSiteSuperAdmin: false })).toBe(true);
    expect(canShowExerciseDelete({ scope: 'GLOBAL', isSiteAdmin: false, isSiteSuperAdmin: true })).toBe(true);
  });
});
