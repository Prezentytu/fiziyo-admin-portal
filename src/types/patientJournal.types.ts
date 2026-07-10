// Typy dla notatek dziennika pacjenta (widok fizjoterapeuty, read-only)

export type JournalVisibility = 'PRIVATE' | 'SHARED_WITH_THERAPIST';

export interface PatientJournalEntry {
  id: string;
  patientId: string;
  organizationId: string;
  title?: string | null;
  content: string;
  entryDate?: string | null;
  visibility: JournalVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface PatientSharedJournalEntriesResponse {
  patientSharedJournalEntries: PatientJournalEntry[];
}
