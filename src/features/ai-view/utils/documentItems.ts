import { IMPORT_CONFIDENT_MATCH_THRESHOLD } from '@/features/import/importMatching.constants';
import type { DocumentAnalysisResult } from '@/types/import.types';
import type { DocumentItem } from './chatCards';
import { searchExercises, type SearchableExercise } from './exerciseLookup';
import type { DraftDose } from './setDraft';
import { tokenizeWords, wordMatches } from './textMatch';

export const MAX_DOCUMENT_ITEMS = 20;
const MIN_CONTENT_WORD = 4;
const FILLER_WORDS = new Set(['przy', 'oraz', 'albo', 'jako', 'przez']);
const SEARCH_CANDIDATES = 3;
// Joining words only; every other token tells exercises apart, short ones too ("Noga L", "SLR P").
const JOINING_WORDS = new Set(['w', 'we', 'na', 'z', 'ze', 'do', 'i', 'o', 'po', 'od', 'u', 'a', 'oraz', 'albo', 'przez']);

// Words that change what the exercise is: position, side, equipment ("na brzuchu", "przy ścianie").
function contentWords(name: string): string[] {
  return tokenizeWords(name).filter((word) => word.length >= MIN_CONTENT_WORD && !FILLER_WORDS.has(word));
}

function covers(words: readonly string[], inName: readonly string[]): boolean {
  return words.every((word) =>
    inName.some((candidate) => wordMatches(candidate, word) || wordMatches(word, candidate))
  );
}

/**
 * The note and the catalog name the same exercise only when neither adds a word the other lacks:
 * "Unoszenie prostej nogi w leżeniu" is not "… w leżeniu na brzuchu" (report 01.11, P0-5).
 */
export function namesAgree(noteName: string, catalogName: string): boolean {
  const noteWords = distinguishingWords(noteName);
  const catalogWords = distinguishingWords(catalogName);
  if (noteWords.length === 0 || catalogWords.length === 0) return false;
  return covers(noteWords, catalogWords) && covers(catalogWords, noteWords);
}

function distinguishingWords(name: string): string[] {
  return tokenizeWords(name).filter((word) => !JOINING_WORDS.has(word));
}

/**
 * Exercises the import found in a document or visit note. A confident match whose name agrees is
 * reused; a confident one that adds or drops a word, or what the chat's own search finds for an
 * unmatched position, is only a suggestion the therapist confirms ("czy chodziło o…?").
 */
export function toDocumentItems(
  result: Pick<DocumentAnalysisResult, 'exercises' | 'matchSuggestions'>,
  catalog: readonly SearchableExercise[] = []
): DocumentItem[] {
  return result.exercises.slice(0, MAX_DOCUMENT_ITEMS).map((exercise) => {
    const item: DocumentItem = {
      name: exercise.name,
      description: exercise.description,
      sets: exercise.sets,
      reps: exercise.reps,
      duration: exercise.duration,
    };
    const best = result.matchSuggestions[exercise.tempId]?.[0];
    const imported =
      best !== undefined && best.confidence >= IMPORT_CONFIDENT_MATCH_THRESHOLD
        ? { id: best.existingExerciseId, name: best.existingExerciseName }
        : undefined;
    if (imported && namesAgree(exercise.name, imported.name)) {
      return { ...item, matchedExerciseId: imported.id, matchedName: imported.name };
    }
    // The catalog may hold the exact exercise even when the import proposed another one.
    const noteWords = contentWords(exercise.name);
    const candidates = searchExercises(catalog, exercise.name, SEARCH_CANDIDATES);
    const exact = candidates.find((candidate) => namesAgree(exercise.name, candidate.name));
    if (exact) return { ...item, matchedExerciseId: exact.id, matchedName: exact.name };
    const suggested =
      imported ??
      (noteWords.length > 0
        ? candidates.find((candidate) => covers(noteWords, contentWords(candidate.name)))
        : undefined);
    return suggested ? { ...item, suggestedExerciseId: suggested.id, suggestedName: suggested.name } : item;
  });
}

/** Catalog exercise of a position: its match, or the suggestion once the therapist confirmed it. */
export function itemExerciseId(item: DocumentItem, confirmed: boolean): string | undefined {
  return item.matchedExerciseId ?? (confirmed ? item.suggestedExerciseId : undefined);
}

/** Matched catalog exercises in document order, each once; confirmed suggestions by position index. */
export function matchedExerciseIds(
  items: readonly DocumentItem[],
  confirmed: ReadonlySet<number> = new Set()
): string[] {
  return [
    ...new Set(
      items.flatMap((item, index) => {
        const id = itemExerciseId(item, confirmed.has(index));
        return id ? [id] : [];
      })
    ),
  ];
}

/** Series, repetitions and hold time written in the note, so "3×15" does not become the catalog's 3×10. */
export function documentDoses(
  items: readonly DocumentItem[],
  confirmed: ReadonlySet<number> = new Set()
): Record<string, DraftDose> {
  const doses: Record<string, DraftDose> = {};
  items.forEach((item, index) => {
    const id = itemExerciseId(item, confirmed.has(index));
    if (!id || doses[id]) return;
    const dose: DraftDose = {};
    if (item.sets && item.sets > 0) dose.sets = item.sets;
    if (item.reps && item.reps > 0) dose.reps = item.reps;
    if (item.duration && item.duration > 0) dose.duration = item.duration;
    if (Object.keys(dose).length > 0) doses[id] = dose;
  });
  return doses;
}
