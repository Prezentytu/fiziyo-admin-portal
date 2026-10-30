import { describe, expect, it } from 'vitest';

import type { DocumentAnalysisResult } from '@/types/import.types';
import { matchedExerciseIds, MAX_DOCUMENT_ITEMS, toDocumentItems } from '../documentItems';

function analysis(
  exercises: Array<{ tempId: string; name: string }>,
  matchSuggestions: Record<
    string,
    Array<{ existingExerciseId: string; existingExerciseName: string; confidence: number }>
  >
): Pick<DocumentAnalysisResult, 'exercises' | 'matchSuggestions'> {
  return { exercises, matchSuggestions } as unknown as Pick<DocumentAnalysisResult, 'exercises' | 'matchSuggestions'>;
}

describe('toDocumentItems', () => {
  it('reuses a catalog exercise only for a confident match', () => {
    const items = toDocumentItems(
      analysis(
        [
          { tempId: 't1', name: 'Przysiad' },
          { tempId: 't2', name: 'Mostek' },
          { tempId: 't3', name: 'Nowe ćwiczenie' },
        ],
        {
          t1: [{ existingExerciseId: 'e-squat', existingExerciseName: 'Przysiad przy ścianie', confidence: 0.92 }],
          t2: [{ existingExerciseId: 'e-bridge', existingExerciseName: 'Mostek', confidence: 0.5 }],
        }
      )
    );
    expect(items.map((item) => item.matchedExerciseId)).toEqual(['e-squat', undefined, undefined]);
    expect(items[0].matchedName).toBe('Przysiad przy ścianie');
  });

  it('keeps at most 20 exercises', () => {
    const exercises = Array.from({ length: MAX_DOCUMENT_ITEMS + 3 }, (_, index) => ({
      tempId: `t${index}`,
      name: `E${index}`,
    }));
    expect(toDocumentItems(analysis(exercises, {}))).toHaveLength(MAX_DOCUMENT_ITEMS);
  });
});

describe('matchedExerciseIds', () => {
  it('returns matched ids in document order, each once', () => {
    expect(
      matchedExerciseIds([
        { name: 'A', matchedExerciseId: 'e2' },
        { name: 'B' },
        { name: 'C', matchedExerciseId: 'e1' },
        { name: 'D', matchedExerciseId: 'e2' },
      ])
    ).toEqual(['e2', 'e1']);
  });
});
