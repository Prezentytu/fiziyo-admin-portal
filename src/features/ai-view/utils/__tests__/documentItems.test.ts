import { describe, expect, it } from 'vitest';

import type { DocumentAnalysisResult } from '@/types/import.types';
import { documentDoses, matchedExerciseIds, MAX_DOCUMENT_ITEMS, toDocumentItems } from '../documentItems';

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
    expect(items.map((item) => item.matchedExerciseId)).toEqual([undefined, undefined, undefined]);
    // The catalog name is more specific than the note: a suggestion, not a ✓.
    expect(items[0]).toMatchObject({ suggestedExerciseId: 'e-squat', suggestedName: 'Przysiad przy ścianie' });
  });

  // Report 01.11 (P0-5): the supine straight-leg raise was matched with ✓ to the prone one.
  it('asks instead of matching when the catalog adds a position the note does not have', () => {
    const items = toDocumentItems(
      analysis(
        [
          { tempId: 't1', name: 'Unoszenie prostej nogi w leżeniu' },
          { tempId: 't2', name: 'Mostek biodrowy' },
        ],
        {
          t1: [
            {
              existingExerciseId: 'e-prone',
              existingExerciseName: 'Unoszenie prostej nogi w leżeniu na brzuchu',
              confidence: 0.95,
            },
          ],
          t2: [{ existingExerciseId: 'e-bridge', existingExerciseName: 'Mostki biodrowe', confidence: 0.9 }],
        }
      )
    );
    expect(items[0]).toMatchObject({ suggestedExerciseId: 'e-prone' });
    expect(items[0].matchedExerciseId).toBeUndefined();
    expect(items[1]).toMatchObject({ matchedExerciseId: 'e-bridge' });
  });

  it('tells sides apart by short tokens too', () => {
    const items = toDocumentItems(
      analysis(
        [
          { tempId: 't1', name: 'Noga L' },
          { tempId: 't2', name: 'SLR L' },
        ],
        {
          t1: [{ existingExerciseId: 'e-right', existingExerciseName: 'Noga P', confidence: 0.95 }],
          t2: [{ existingExerciseId: 'e-slr-right', existingExerciseName: 'SLR P', confidence: 0.95 }],
        }
      )
    );
    expect(items.map((item) => item.matchedExerciseId)).toEqual([undefined, undefined]);
    expect(items.map((item) => item.suggestedExerciseId)).toEqual(['e-right', 'e-slr-right']);
  });

  it('prefers the exact catalog exercise over a different confident import match', () => {
    const items = toDocumentItems(
      analysis([{ tempId: 't1', name: 'Unoszenie prostej nogi w leżeniu' }], {
        t1: [
          {
            existingExerciseId: 'e-prone',
            existingExerciseName: 'Unoszenie prostej nogi w leżeniu na brzuchu',
            confidence: 0.95,
          },
        ],
      }),
      [
        { id: 'e-prone', name: 'Unoszenie prostej nogi w leżeniu na brzuchu' },
        { id: 'e-supine', name: 'Unoszenie prostej nogi w leżeniu' },
      ]
    );
    expect(items[0]).toMatchObject({ matchedExerciseId: 'e-supine' });
  });

  // Report 01.11 (P0-5): "brak w katalogu" for exercises the chat search finds, so "Utwórz" made duplicates.
  it('finds what the import missed with the chat search', () => {
    const catalog = [
      { id: 'e-quad', name: 'Napinanie mięśnia czworogłowego' },
      { id: 'e-wall', name: 'Przysiad przy ścianie' },
      { id: 'e-other', name: 'Pompki na kolanach' },
    ];
    const items = toDocumentItems(
      analysis(
        [
          { tempId: 't1', name: 'Przysiad przy ścianie' },
          { tempId: 't2', name: 'Napinanie czworogłowego' },
          { tempId: 't3', name: 'Rowerek' },
        ],
        {}
      ),
      catalog
    );
    expect(items[0]).toMatchObject({ matchedExerciseId: 'e-wall' });
    expect(items[1]).toMatchObject({ suggestedExerciseId: 'e-quad' });
    expect(items[2].matchedExerciseId ?? items[2].suggestedExerciseId).toBeUndefined();
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

describe('documentDoses', () => {
  it('carries the note numbers of matched and confirmed positions only', () => {
    const items = [
      { name: 'Mostek', sets: 3, reps: 15, matchedExerciseId: 'e-bridge' },
      { name: 'Deska', sets: 3, duration: 30, suggestedExerciseId: 'e-plank' },
      { name: 'Rowerek', sets: 2, reps: 20 },
      { name: 'SLR', matchedExerciseId: 'e-slr' },
    ];
    expect(documentDoses(items)).toEqual({ 'e-bridge': { sets: 3, reps: 15 } });
    expect(documentDoses(items, new Set([1]))).toEqual({
      'e-bridge': { sets: 3, reps: 15 },
      'e-plank': { sets: 3, duration: 30 },
    });
    expect(matchedExerciseIds(items, new Set([1]))).toEqual(['e-bridge', 'e-plank', 'e-slr']);
  });
});
