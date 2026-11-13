/**
 * „Pacjent przeczytał” przy uwadze fizjoterapeuty (FR-007 6e, S-01 R3). Backend stawia `notesUpdatedAt` przy każdej
 * zmianie tekstu uwagi w pozycji planu albo w notatce do planu, a pacjent potwierdza ją w aplikacji („Rozumiem”,
 * `notesSeenAt`). Ta sama reguła co w aplikacji: przeczytana, gdy `notesSeenAt >= notesUpdatedAt`.
 */
export interface TherapistNoteStamp {
  notesUpdatedAt?: string | null;
  notesSeenAt?: string | null;
}

export type TherapistNoteReadState = { kind: 'read'; seenAt: string } | { kind: 'unread' };

interface RawStampMapping extends TherapistNoteStamp {
  id?: string | null;
}

export interface RawTherapistNoteStampRow extends TherapistNoteStamp {
  id?: string | null;
  exerciseSet?: { exerciseMappings?: (RawStampMapping | null)[] | null } | null;
}

export interface TherapistNoteStampIndex {
  plans: ReadonlyMap<string, TherapistNoteStamp>;
  mappings: ReadonlyMap<string, TherapistNoteStamp>;
}

export const EMPTY_THERAPIST_NOTE_STAMP_INDEX: TherapistNoteStampIndex = { plans: new Map(), mappings: new Map() };

const toTime = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string' || value.length === 0) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
};

/** Indeks znaczników po id przypisania (notatka do planu) i id pozycji planu (uwaga do ćwiczenia). */
export function buildTherapistNoteStampIndex(
  rows: readonly (RawTherapistNoteStampRow | null)[] | null | undefined
): TherapistNoteStampIndex {
  const plans = new Map<string, TherapistNoteStamp>();
  const mappings = new Map<string, TherapistNoteStamp>();
  for (const row of rows ?? []) {
    if (!row?.id) continue;
    plans.set(row.id, { notesUpdatedAt: row.notesUpdatedAt, notesSeenAt: row.notesSeenAt });
    for (const mapping of row.exerciseSet?.exerciseMappings ?? []) {
      if (!mapping?.id) continue;
      mappings.set(mapping.id, { notesUpdatedAt: mapping.notesUpdatedAt, notesSeenAt: mapping.notesSeenAt });
    }
  }
  return { plans, mappings };
}

/**
 * Stan przeczytania widocznej uwagi albo `null`, gdy nie ma czego pokazać: pusta uwaga, uwaga sprzed znaczników
 * albo uwaga z nadpisania przypisania (`overrideHasNotes`), którą pacjent widzi zamiast tekstu pozycji.
 */
export function resolveTherapistNoteReadState(
  stamp: TherapistNoteStamp | null | undefined,
  options: { noteText: string | null | undefined; overrideHasNotes?: boolean }
): TherapistNoteReadState | null {
  if (!options.noteText?.trim() || options.overrideHasNotes) return null;
  const updatedAt = toTime(stamp?.notesUpdatedAt);
  if (updatedAt === null) return null;
  const seenRaw = stamp?.notesSeenAt;
  const seenAt = toTime(seenRaw);
  if (seenAt === null || seenAt < updatedAt || !seenRaw) return { kind: 'unread' };
  return { kind: 'read', seenAt: seenRaw };
}

/**
 * Czy wpis nadpisania, który czyta aplikacja pacjenta (pod id pozycji, a bez niego pod id ćwiczenia), ma klucz `notes`.
 */
export function overrideEntryHasNotes(
  overrides: Readonly<Record<string, unknown>>,
  mapping: { id: string; exerciseId?: string | null }
): boolean {
  const isEntry = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const byMapping = overrides[mapping.id];
  const entry = isEntry(byMapping) ? byMapping : mapping.exerciseId ? overrides[mapping.exerciseId] : undefined;
  return isEntry(entry) && 'notes' in entry;
}
