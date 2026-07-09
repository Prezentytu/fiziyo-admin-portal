import type { PatientJournalEntry } from '@/types/patientJournal.types';

const PREVIEW_MAX_LENGTH = 220;

export function resolveJournalEntryDisplayDate(entry: Pick<PatientJournalEntry, 'entryDate' | 'createdAt'>): Date {
  return new Date(entry.entryDate ?? entry.createdAt);
}

export function sortJournalEntriesByDisplayDate(entries: readonly PatientJournalEntry[]): PatientJournalEntry[] {
  return [...entries].sort(
    (a, b) => resolveJournalEntryDisplayDate(b).getTime() - resolveJournalEntryDisplayDate(a).getTime()
  );
}

export function isJournalEntryTruncated(content: string, maxLength: number = PREVIEW_MAX_LENGTH): boolean {
  return content.trim().length > maxLength;
}

export function buildJournalEntryPreview(content: string, maxLength: number = PREVIEW_MAX_LENGTH): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}
