import { describe, expect, it } from 'vitest';

import { INTERNAL_NOTES_MAX_LENGTH, normalizeInternalNotes, shouldSaveInternalNotes } from './internalNotes';

describe('normalizeInternalNotes', () => {
  it('treats blank text as cleared notes', () => {
    expect(normalizeInternalNotes('   ')).toBeNull();
    expect(normalizeInternalNotes(undefined)).toBeNull();
    expect(normalizeInternalNotes('Duplikat ex-42')).toBe('Duplikat ex-42');
  });
});

describe('shouldSaveInternalNotes', () => {
  it('skips saving when nothing changed or only whitespace replaced empty notes', () => {
    expect(shouldSaveInternalNotes('Film z kanału X', 'Film z kanału X')).toBe(false);
    expect(shouldSaveInternalNotes(null, '  ')).toBe(false);
  });

  it('saves new text and clearing existing notes', () => {
    expect(shouldSaveInternalNotes(null, 'Źródło: film z kanału X')).toBe(true);
    expect(shouldSaveInternalNotes('Źródło: film', '')).toBe(true);
  });

  it('does not save text over the backend limit', () => {
    expect(shouldSaveInternalNotes(null, 'x'.repeat(INTERNAL_NOTES_MAX_LENGTH + 1))).toBe(false);
    expect(shouldSaveInternalNotes(null, 'x'.repeat(INTERNAL_NOTES_MAX_LENGTH))).toBe(true);
  });
});
