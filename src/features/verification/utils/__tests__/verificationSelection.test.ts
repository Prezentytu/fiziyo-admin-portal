import { describe, expect, it } from 'vitest';

import {
  getSelectedVisibleIds,
  removeSelectedIds,
  toggleVisibleSelection,
} from '@/features/verification/utils/verificationSelection';

describe('verificationSelection', () => {
  it('selects all visible ids without duplicating existing selections', () => {
    expect(toggleVisibleSelection(['exercise-1'], ['exercise-1', 'exercise-2'])).toEqual(['exercise-1', 'exercise-2']);
  });

  it('clears only visible ids when the page is fully selected', () => {
    expect(toggleVisibleSelection(['exercise-1', 'exercise-2', 'exercise-3'], ['exercise-1', 'exercise-2'])).toEqual([
      'exercise-3',
    ]);
  });

  it('returns only selected ids from the current page', () => {
    expect(getSelectedVisibleIds(['exercise-1', 'exercise-3'], ['exercise-1', 'exercise-2'])).toEqual(['exercise-1']);
  });

  it('removes processed ids and keeps partial failures selected', () => {
    expect(removeSelectedIds(['exercise-1', 'exercise-2', 'exercise-3'], ['exercise-1', 'exercise-3'])).toEqual([
      'exercise-2',
    ]);
  });
});
