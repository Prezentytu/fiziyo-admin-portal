import type {
  ExerciseReviewNote,
  ExerciseReviewNoteKind,
  ExerciseReviewNoteVisibility,
} from '@/graphql/types/exerciseReviewNote.types';

export const REVIEW_NOTE_MAX_LENGTH = 2000;

const MARKER_LABELS: Record<Exclude<ExerciseReviewNoteKind, 'NOTE'>, string> = {
  SENT_TO_INTERNAL_FIXES: 'Wysłano do poprawek wewnętrznych',
  SENT_TO_AUTHOR: 'Odesłano do autora',
  INTERNAL_FIXES_DONE: 'Poprawione, do sprawdzenia',
  APPROVED: 'Zatwierdzono',
  REJECTED: 'Odesłano do poprawek',
  ARCHIVED: 'Zarchiwizowano',
  REOPENED: 'Wróciło do weryfikacji',
  CONTENT_CHANGED: 'Zmieniono',
};

/** Wpis systemowy logu (decyzja, linia rundy, zmiana treści), a nie uwaga człowieka. */
export function isReviewMarker(note: Pick<ExerciseReviewNote, 'kind'>): boolean {
  return note.kind !== 'NOTE';
}

export function reviewMarkerLabel(kind: ExerciseReviewNoteKind): string {
  return kind === 'NOTE' ? '' : (MARKER_LABELS[kind] ?? 'Zdarzenie');
}

/** Linie, które tną rundę; decyzje i zmiany treści tylko opisują, co się działo. */
const ROUND_CUTS: readonly ExerciseReviewNoteKind[] = [
  'SENT_TO_INTERNAL_FIXES',
  'SENT_TO_AUTHOR',
  'INTERNAL_FIXES_DONE',
];

/** Uwagi weryfikatora pod ostatnią linią odcięcia rundy: pójdą do poprawek wewnętrznych. */
export function unsentReviewNotes(thread: readonly ExerciseReviewNote[]): ExerciseReviewNote[] {
  let lastCut = -1;
  thread.forEach((note, index) => {
    if (ROUND_CUTS.includes(note.kind)) lastCut = index;
  });
  return thread.slice(lastCut + 1).filter((note) => note.kind === 'NOTE' && note.authorRole === 'REVIEWER');
}

/** Uwagi dla autora jeszcze do niego niewysłane: tylko te idą przy „Odeślij do autora”. */
export function unsentAuthorNotes(thread: readonly ExerciseReviewNote[]): ExerciseReviewNote[] {
  return thread.filter(
    (note) =>
      note.kind === 'NOTE' && note.authorRole === 'REVIEWER' && note.visibility === 'AUTHOR' && !note.isSentToAuthor
  );
}

// ============================================
// Zakres widoczności
// ============================================

/** Od najwęższego; ta sama kolejność co w backendzie. */
export const REVIEW_NOTE_VISIBILITIES: readonly ExerciseReviewNoteVisibility[] = [
  'FIZIYO_ADMINS',
  'ORG_REVIEWERS',
  'AUTHOR',
  'THERAPIST',
];

export const REVIEW_NOTE_VISIBILITY_META: Record<ExerciseReviewNoteVisibility, { label: string; hint: string }> = {
  FIZIYO_ADMINS: { label: 'Zespół FiziYo', hint: 'Tylko administratorzy FiziYo' },
  ORG_REVIEWERS: { label: 'Weryfikatorzy', hint: 'Weryfikatorzy w gabinecie ćwiczenia' },
  AUTHOR: { label: 'Autor', hint: 'Autor ćwiczenia, po odesłaniu do poprawek' },
  THERAPIST: { label: 'Fizjoterapeuci', hint: 'Każdy fizjoterapeuta, który używa ćwiczenia' },
};

/** Zakresy węższe od obecnego, które pytający może nadać (zmiana tylko na węższy). */
export function narrowerVisibilities(
  current: ExerciseReviewNoteVisibility,
  writable: readonly ExerciseReviewNoteVisibility[]
): ExerciseReviewNoteVisibility[] {
  const rank = REVIEW_NOTE_VISIBILITIES.indexOf(current);
  return REVIEW_NOTE_VISIBILITIES.filter((visibility, index) => index < rank && writable.includes(visibility));
}

// ============================================
// Zdarzenia
// ============================================

const FIELD_LABELS: Record<string, string> = {
  name: 'nazwa',
  patientDescription: 'opis dla pacjenta',
  clinicalDescription: 'opis dla fizjoterapeuty',
  audioCue: 'wskazówka głosowa',
  notes: 'notatki',
  type: 'typ',
  side: 'strona ciała',
  preparationTime: 'czas przygotowania',
  defaultExecutionTime: 'czas powtórzenia',
  defaultSets: 'serie',
  defaultReps: 'powtórzenia',
  defaultDuration: 'czas trwania',
  defaultRestBetweenSets: 'przerwa między seriami',
  defaultRestBetweenReps: 'przerwa między powtórzeniami',
  tempo: 'tempo',
  defaultLoad: 'obciążenie',
  resistance: 'opór',
  equipment: 'sprzęt',
  rangeOfMotion: 'zakres ruchu',
  thumbnailUrl: 'zdjęcia',
  gifUrl: 'zdjęcia',
  imageUrl: 'zdjęcia',
  images: 'zdjęcia',
  media: 'zdjęcia',
  videoUrl: 'wideo',
  videos: 'wideo',
  mainTags: 'tagi',
  additionalTags: 'tagi',
  aliases: 'inne nazwy',
  progressionFamilyId: 'progresja',
  difficultyLevel: 'poziom trudności',
};

const DOCUMENT_LABELS: Record<string, string> = {
  'patient.steps': 'kroki',
  'patient.cues': 'wskazówki',
  'patient.cue_phases': 'wskazówki',
  'patient.step_images': 'zdjęcia kroków',
  'patient.purpose': 'po co',
  'patient.precautions': 'ostrożności',
};

function documentLabel(path: string): string {
  if (DOCUMENT_LABELS[path]) return DOCUMENT_LABELS[path];
  if (path.startsWith('patient')) return 'treść dla pacjenta';
  if (path.startsWith('therapist')) return 'treść dla fizjoterapeuty';
  if (path.startsWith('parameters') || path.startsWith('dose')) return 'parametry';
  return 'treść ćwiczenia';
}

/** Zmienione pola zdarzenia po polsku, bez powtórzeń, w kolejności z backendu. */
export function changedFieldLabels(fields: readonly string[]): string[] {
  const labels = fields.map((field) =>
    field.startsWith('enrichmentData.')
      ? documentLabel(field.slice('enrichmentData.'.length))
      : (FIELD_LABELS[field] ?? field)
  );
  return [...new Set(labels)];
}

/** Jedna linia zdarzenia, np. „Zmieniono: nazwa, kroki, wideo” albo „Odesłano do autora · 2 uwagi”. */
export function reviewEventText(note: Pick<ExerciseReviewNote, 'kind' | 'changedFields' | 'sentNoteCount'>): string {
  const label = reviewMarkerLabel(note.kind);
  if (note.kind === 'CONTENT_CHANGED') {
    const fields = changedFieldLabels(note.changedFields ?? []);
    return fields.length > 0 ? `${label}: ${fields.join(', ')}` : label;
  }
  if (note.kind === 'SENT_TO_AUTHOR' && note.sentNoteCount) {
    return `${label} · ${note.sentNoteCount} ${pluralNotes(note.sentNoteCount)}`;
  }
  return label;
}

function pluralNotes(count: number): string {
  if (count === 1) return 'uwaga';
  const lastDigit = count % 10;
  const lastTwo = count % 100;
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'uwagi' : 'uwag';
}

export type ReviewLogFilter = 'all' | 'notes' | 'events';

export const REVIEW_LOG_FILTERS: readonly { value: ReviewLogFilter; label: string }[] = [
  { value: 'all', label: 'Wszystko' },
  { value: 'notes', label: 'Tylko uwagi' },
  { value: 'events', label: 'Tylko zdarzenia' },
];

export function filterReviewLog(thread: readonly ExerciseReviewNote[], filter: ReviewLogFilter): ExerciseReviewNote[] {
  if (filter === 'notes') return thread.filter((note) => !isReviewMarker(note));
  if (filter === 'events') return thread.filter(isReviewMarker);
  return [...thread];
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

export type ReviewAssigneeFilter = 'all' | 'mine' | 'unassigned';

export function parseReviewAssigneeFilter(value: string | null | undefined): ReviewAssigneeFilter {
  return value === 'mine' || value === 'unassigned' ? value : 'all';
}
