/** Log zestawu (SPEC-063, fizjo-app#741). Pacjent dostaje z backendu pustą listę. */
export type ExerciseSetLogKind = 'NOTE' | 'CREATED' | 'CONTENT_CHANGED' | 'PUBLISHED' | 'ARCHIVED';
export type ExerciseSetLogAuthorRole = 'FIZIYO_ADMIN' | 'THERAPIST' | 'ASSISTANT' | 'SYSTEM';
export type ExerciseSetLogSource = 'CHAT' | 'WIZARD' | 'EDITOR' | 'MOBILE' | 'OPS' | 'IMPORT';
export type ExerciseSetLogVisibility = 'PRIVATE' | 'FIZIYO_ADMINS' | 'ORGANIZATION' | 'ALL_THERAPISTS';

export interface ExerciseSetLogEntry {
  id: string;
  exerciseSetId: string;
  kind: ExerciseSetLogKind;
  authorRole: ExerciseSetLogAuthorRole;
  authorName: string;
  isMine: boolean;
  source: ExerciseSetLogSource | null;
  body: string;
  /** JSON zmian dla `CONTENT_CHANGED`: `{ fields, items, added, removed }`. */
  data: string | null;
  visibility: ExerciseSetLogVisibility;
  createdAt: string;
  updatedAt: string | null;
}

export interface GetExerciseSetLogResponse {
  exerciseSetLog: ExerciseSetLogEntry[];
}

export interface AddExerciseSetNoteResponse {
  addExerciseSetNote: ExerciseSetLogEntry;
}

export interface UpdateExerciseSetNoteResponse {
  updateExerciseSetNote: ExerciseSetLogEntry;
}

export interface DeleteExerciseSetNoteResponse {
  deleteExerciseSetNote: boolean;
}
