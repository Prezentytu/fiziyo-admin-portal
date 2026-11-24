import type { ExerciseReviewNote, ExerciseReviewNoteKind } from '@/graphql/types/exerciseReviewNote.types';

export const REVIEW_NOTE_MAX_LENGTH = 2000;

const MARKER_LABELS: Record<Exclude<ExerciseReviewNoteKind, 'NOTE'>, string> = {
  SENT_TO_INTERNAL_FIXES: 'Wysłano do poprawek wewnętrznych',
  SENT_TO_AUTHOR: 'Odesłano do autora',
  INTERNAL_FIXES_DONE: 'Poprawione, do sprawdzenia',
};

export function isReviewMarker(note: Pick<ExerciseReviewNote, 'kind'>): boolean {
  return note.kind !== 'NOTE';
}

export function reviewMarkerLabel(kind: ExerciseReviewNoteKind): string {
  return kind === 'NOTE' ? '' : MARKER_LABELS[kind];
}

/** Uwagi weryfikatora pod ostatnią linią odcięcia: tylko te pójdą przy następnym wysłaniu. */
export function unsentReviewNotes(thread: readonly ExerciseReviewNote[]): ExerciseReviewNote[] {
  let lastMarker = -1;
  thread.forEach((note, index) => {
    if (isReviewMarker(note)) lastMarker = index;
  });
  return thread.slice(lastMarker + 1).filter((note) => note.kind === 'NOTE' && note.authorRole === 'REVIEWER');
}

export interface ReviewThreadEntry {
  note: ExerciseReviewNote;
  /** Odpowiedzi (autora, asystenta, weryfikatora) przypięte do tej uwagi, w kolejności dodania. */
  replies: ExerciseReviewNote[];
}

/**
 * Wątek do wyświetlenia: odpowiedź stoi pod uwagą, której dotyczy, a linie odcięcia i uwagi bez rodzica
 * zostają w kolejności czasu. Odpowiedź na wpis spoza listy (autor nie widzi cudzych rund) idzie luzem.
 */
export function buildReviewThread(thread: readonly ExerciseReviewNote[]): ReviewThreadEntry[] {
  const entries = new Map<string, ReviewThreadEntry>();
  const ordered: ReviewThreadEntry[] = [];
  for (const note of thread) {
    const parent = note.replyToNoteId ? entries.get(note.replyToNoteId) : undefined;
    if (parent && !isReviewMarker(note)) {
      parent.replies.push(note);
      continue;
    }
    const entry: ReviewThreadEntry = { note, replies: [] };
    entries.set(note.id, entry);
    ordered.push(entry);
  }
  return ordered;
}

export function formatReviewNoteTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay ? time : `${date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}, ${time}`;
}

/** `available`: moje i niczyje, bez ćwiczeń wziętych przez innego weryfikatora (SPEC-041). */
/** Filtr przydziału: wszystkie, moje, moje i wolne, niczyje albo jednej osoby z zespołu (`user:<id>`). */
export type ReviewAssigneeFilter = 'all' | 'mine' | 'available' | 'unassigned' | `user:${string}`;

const ASSIGNEE_USER_PREFIX = 'user:';
const USER_ID_PATTERN = /^[\w-]{1,64}$/;

export function assigneeFilterForUser(userId: string, isMe = false): ReviewAssigneeFilter {
  return isMe ? 'mine' : `user:${userId}`;
}

export function parseReviewAssigneeFilter(value: string | null | undefined): ReviewAssigneeFilter {
  if (value === 'mine' || value === 'available' || value === 'unassigned') return value;
  if (value?.startsWith(ASSIGNEE_USER_PREFIX) && USER_ID_PATTERN.test(value.slice(ASSIGNEE_USER_PREFIX.length))) {
    return value as ReviewAssigneeFilter;
  }
  return 'all';
}
