export const DUPLICATE_REVIEW_NOTES_PREFIX = '[POTENTIAL_DUPLICATE] To ćwiczenie jest już w bazie jako „';

export function duplicateReviewReason(notes: string | null | undefined): string | null {
  if (!notes?.startsWith(DUPLICATE_REVIEW_NOTES_PREFIX)) return null;

  const reference = notes.slice(DUPLICATE_REVIEW_NOTES_PREFIX.length);
  const original = reference.match(/^([\s\S]+)” \(ID: [^)]+\)\.$/)?.[1];
  return original ? `To ćwiczenie jest już w katalogu FiziYo jako „${original}”.` : null;
}
