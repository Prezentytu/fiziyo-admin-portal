import { describe, expect, it } from 'vitest';
import {
  PDF_EXERCISES_PER_COMPACT_PAGE,
  PDF_EXERCISES_PER_FULL_PAGE,
  chunkExercisesForPages,
  formatExecutionParameters,
  shouldAllowExerciseRowWrap,
} from '../pdfPageUtils';

describe('chunkExercisesForPages', () => {
  it('returns one empty page for an empty list', () => {
    expect(chunkExercisesForPages([])).toEqual([[]]);
  });

  it('keeps a short set on a single page', () => {
    const exercises = [{ id: '1' }, { id: '2' }];
    expect(chunkExercisesForPages(exercises)).toEqual([exercises]);
  });

  it('splits 15 full-mode exercises into pages of 4', () => {
    const exercises = Array.from({ length: 15 }, (_, index) => ({ id: String(index + 1) }));
    const pages = chunkExercisesForPages(exercises);
    expect(PDF_EXERCISES_PER_FULL_PAGE).toBe(4);
    expect(pages).toHaveLength(4);
    expect(pages[0]).toHaveLength(4);
    expect(pages[3]).toHaveLength(3);
    expect(pages.flat().map((item) => item.id)).toEqual(exercises.map((item) => item.id));
  });

  it('uses a larger page size in compact mode', () => {
    const exercises = Array.from({ length: 15 }, (_, index) => index);
    const pages = chunkExercisesForPages(exercises, { compact: true });
    expect(PDF_EXERCISES_PER_COMPACT_PAGE).toBe(10);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(10);
    expect(pages[1]).toHaveLength(5);
  });
});

describe('formatExecutionParameters', () => {
  it('formats sets, reps and rest without the word dawkowanie', () => {
    const items = formatExecutionParameters({ sets: 3, reps: 10, restSets: 30 });
    expect(items.map((item) => item.label).join(' ')).not.toMatch(/dawkowanie/i);
    expect(items).toEqual([
      { label: 'Serie', value: '3' },
      { label: 'Powtórzenia', value: '10' },
      { label: 'Przerwa', value: '30 sekund' },
    ]);
  });

  it('shows duration when there are no reps, plus executionTime', () => {
    const items = formatExecutionParameters({ duration: 60, executionTime: 5 });
    expect(items.some((item) => item.label === 'Czas')).toBe(true);
    expect(items.some((item) => item.label === 'Czas powtórzenia')).toBe(true);
  });

  it('falls back to podstawowe parametry when nothing is set', () => {
    expect(formatExecutionParameters({})).toEqual([{ label: 'Podstawowe parametry', value: 'Wg zaleceń' }]);
  });
});

describe('shouldAllowExerciseRowWrap', () => {
  it('keeps short rows unwrapped and allows wrap for long descriptions', () => {
    expect(shouldAllowExerciseRowWrap('Krótki opis')).toBe(false);
    expect(shouldAllowExerciseRowWrap('x'.repeat(281))).toBe(true);
  });
});
