import { describe, expect, it } from 'vitest';

import { getBaseExerciseName, getNextExerciseCopyName } from '../getNextExerciseCopyName';

describe('getBaseExerciseName', () => {
  it('returns original name when there is no copy prefix', () => {
    expect(getBaseExerciseName('Przysiad')).toBe('Przysiad');
  });

  it('strips copy prefix with and without number', () => {
    expect(getBaseExerciseName('Kopia Przysiad')).toBe('Przysiad');
    expect(getBaseExerciseName('Kopia 3 Przysiad')).toBe('Przysiad');
  });
});

describe('getNextExerciseCopyName', () => {
  it('creates first copy name with Kopia prefix', () => {
    expect(getNextExerciseCopyName('Przysiad', [])).toBe('Kopia Przysiad');
  });

  it('increments copy number when copies already exist', () => {
    const existingNames = ['Przysiad', 'Kopia Przysiad', 'Kopia 2 Przysiad'];
    expect(getNextExerciseCopyName('Przysiad', existingNames)).toBe('Kopia 3 Przysiad');
  });

  it('keeps numbering when source is already a copy', () => {
    const existingNames = ['Przysiad', 'Kopia Przysiad', 'Kopia 2 Przysiad', 'Kopia 4 Przysiad'];
    expect(getNextExerciseCopyName('Kopia 2 Przysiad', existingNames)).toBe('Kopia 5 Przysiad');
  });

  it('does not mix copy numbers between different base names', () => {
    const existingNames = ['Kopia Mobilizacja barku', 'Kopia 2 Mobilizacja barku'];
    expect(getNextExerciseCopyName('Przysiad', existingNames)).toBe('Kopia Przysiad');
  });
});
