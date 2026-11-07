export const INTERNAL_NOTES_MAX_LENGTH = 4000;

/** Backend stores blank notes as null; compare drafts the same way so whitespace edits do not save. */
export function normalizeInternalNotes(value: string | null | undefined): string | null {
  if (value == null || value.trim().length === 0) return null;
  return value;
}

export function shouldSaveInternalNotes(saved: string | null | undefined, draft: string): boolean {
  if (draft.length > INTERNAL_NOTES_MAX_LENGTH) return false;
  return normalizeInternalNotes(saved) !== normalizeInternalNotes(draft);
}
