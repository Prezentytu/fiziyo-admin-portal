import { describe, expect, it } from 'vitest';

import { getExerciseDialogSuccessRoute } from '../exerciseDialogSuccessRoute';

describe('getExerciseDialogSuccessRoute', () => {
  it('opens the existing exercise the therapist picked instead of creating a duplicate', () => {
    expect(getExerciseDialogSuccessRoute({ action: 'existing', exerciseId: 'ex-1' })).toBe('/exercises/ex-1');
  });

  it('opens a copied exercise', () => {
    expect(getExerciseDialogSuccessRoute({ action: 'copied', exerciseId: 'ex-2' })).toBe('/exercises/ex-2');
  });

  it('stays on the list after create or update', () => {
    expect(getExerciseDialogSuccessRoute({ action: 'created', exerciseId: 'ex-3' })).toBeNull();
    expect(getExerciseDialogSuccessRoute({ action: 'updated', exerciseId: 'ex-4' })).toBeNull();
    expect(getExerciseDialogSuccessRoute(undefined)).toBeNull();
  });
});
