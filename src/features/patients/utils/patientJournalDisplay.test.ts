import { describe, expect, it } from 'vitest';

import type { PatientJournalEntry } from '@/types/patientJournal.types';

import {
  buildJournalEntryPreview,
  isJournalEntryTruncated,
  resolveJournalEntryDisplayDate,
  sortJournalEntriesByDisplayDate,
} from './patientJournalDisplay';

function makeEntry(overrides: Partial<PatientJournalEntry>): PatientJournalEntry {
  return {
    id: 'entry-1',
    patientId: 'patient-1',
    organizationId: 'org-1',
    title: null,
    content: 'Treść notatki',
    entryDate: null,
    visibility: 'SHARED_WITH_THERAPIST',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('resolveJournalEntryDisplayDate', () => {
  it('uses entryDate when present', () => {
    const entry = makeEntry({ entryDate: '2026-05-10T00:00:00.000Z', createdAt: '2026-05-01T10:00:00.000Z' });

    expect(resolveJournalEntryDisplayDate(entry).toISOString()).toBe('2026-05-10T00:00:00.000Z');
  });

  it('falls back to createdAt when entryDate is missing', () => {
    const entry = makeEntry({ entryDate: null, createdAt: '2026-05-01T10:00:00.000Z' });

    expect(resolveJournalEntryDisplayDate(entry).toISOString()).toBe('2026-05-01T10:00:00.000Z');
  });
});

describe('sortJournalEntriesByDisplayDate', () => {
  it('sorts entries by resolved display date, newest first', () => {
    const older = makeEntry({ id: 'older', entryDate: '2026-05-01T00:00:00.000Z' });
    const newer = makeEntry({ id: 'newer', entryDate: '2026-05-15T00:00:00.000Z' });
    const fallbackToCreatedAt = makeEntry({
      id: 'fallback',
      entryDate: null,
      createdAt: '2026-05-20T00:00:00.000Z',
    });

    const sorted = sortJournalEntriesByDisplayDate([older, newer, fallbackToCreatedAt]);

    expect(sorted.map((entry) => entry.id)).toEqual(['fallback', 'newer', 'older']);
  });

  it('does not mutate the input array', () => {
    const entries = [makeEntry({ id: 'a' }), makeEntry({ id: 'b' })];
    const original = [...entries];

    sortJournalEntriesByDisplayDate(entries);

    expect(entries).toEqual(original);
  });
});

describe('isJournalEntryTruncated / buildJournalEntryPreview', () => {
  it('reports not truncated and returns full content when under the limit', () => {
    const content = 'Krótka notatka pacjenta.';

    expect(isJournalEntryTruncated(content, 100)).toBe(false);
    expect(buildJournalEntryPreview(content, 100)).toBe(content);
  });

  it('truncates content longer than the limit and appends an ellipsis', () => {
    const content = 'a'.repeat(300);

    expect(isJournalEntryTruncated(content, 220)).toBe(true);
    const preview = buildJournalEntryPreview(content, 220);
    expect(preview.endsWith('…')).toBe(true);
    expect(preview.length).toBe(221);
  });
});
