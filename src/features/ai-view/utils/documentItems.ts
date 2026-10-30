import { IMPORT_CONFIDENT_MATCH_THRESHOLD } from '@/features/import/importMatching.constants';
import type { DocumentAnalysisResult } from '@/types/import.types';
import type { DocumentItem } from './chatCards';

export const MAX_DOCUMENT_ITEMS = 20;

/**
 * Exercises the import found in a document or visit note, each with its catalog match when the
 * match is as confident as the import screen requires to reuse it.
 */
export function toDocumentItems(
  result: Pick<DocumentAnalysisResult, 'exercises' | 'matchSuggestions'>
): DocumentItem[] {
  return result.exercises.slice(0, MAX_DOCUMENT_ITEMS).map((exercise) => {
    const best = result.matchSuggestions[exercise.tempId]?.[0];
    const isConfident = best !== undefined && best.confidence >= IMPORT_CONFIDENT_MATCH_THRESHOLD;
    return {
      name: exercise.name,
      description: exercise.description,
      sets: exercise.sets,
      reps: exercise.reps,
      duration: exercise.duration,
      matchedExerciseId: isConfident ? best.existingExerciseId : undefined,
      matchedName: isConfident ? best.existingExerciseName : undefined,
    };
  });
}

/** Matched catalog exercises in document order, each once. */
export function matchedExerciseIds(items: readonly DocumentItem[]): string[] {
  return [...new Set(items.flatMap((item) => (item.matchedExerciseId ? [item.matchedExerciseId] : [])))];
}
