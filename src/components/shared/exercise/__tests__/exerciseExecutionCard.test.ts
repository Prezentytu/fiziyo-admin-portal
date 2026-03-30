import { describe, it, expect } from 'vitest';
import { isTimerExercise, isFieldEditable } from '../types';

describe('isTimerExercise', () => {
  it('returns true when executionTime > 0', () => {
    expect(isTimerExercise({ executionTime: 1 })).toBe(true);
    expect(isTimerExercise({ executionTime: 30 })).toBe(true);
  });

  it('returns false when executionTime is 0 or undefined', () => {
    expect(isTimerExercise({ executionTime: 0 })).toBe(false);
    expect(isTimerExercise({})).toBe(false);
    expect(isTimerExercise({ executionTime: undefined })).toBe(false);
  });
});

describe('isFieldEditable', () => {
  it('returns false in view mode regardless of editableFields', () => {
    expect(isFieldEditable('sets', 'view')).toBe(false);
    expect(isFieldEditable('sets', 'view', ['sets', 'reps'])).toBe(false);
  });

  it('returns true in edit mode when editableFields is omitted or empty', () => {
    expect(isFieldEditable('sets', 'edit')).toBe(true);
    expect(isFieldEditable('reps', 'edit', [])).toBe(true);
  });

  it('returns true in edit mode when field is in editableFields', () => {
    expect(isFieldEditable('sets', 'edit', ['sets', 'reps'])).toBe(true);
    expect(isFieldEditable('notes', 'edit', ['notes'])).toBe(true);
  });

  it('returns false in edit mode when field is not in editableFields', () => {
    expect(isFieldEditable('sets', 'edit', ['reps'])).toBe(false);
    expect(isFieldEditable('executionTime', 'edit', ['notes'])).toBe(false);
  });
});
