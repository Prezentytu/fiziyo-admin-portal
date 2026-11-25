import type {
  ExerciseSetLogEntry,
  ExerciseSetLogVisibility,
} from '@/graphql/types/exerciseSetLog.types';

/** Ten sam limit co `ExerciseSetLogEntry.MaxBodyLength` w backendzie. */
export const SET_NOTE_MAX_LENGTH = 2000;

export const SET_LOG_VISIBILITY_LABELS: Record<ExerciseSetLogVisibility, string> = {
  PRIVATE: 'Tylko ja',
  FIZIYO_ADMINS: 'Zespół FiziYo',
  ORGANIZATION: 'Gabinet',
  ALL_THERAPISTS: 'Wszyscy fizjo',
};

/**
 * Zakresy, które wywołujący może nadać notatce; pierwszy jest domyślny. Lustro `OrganizationFor` w backendzie:
 * personel pisze dla gabinetu albo prywatnie (D-1); zespół FiziYo pisze dla siebie, dla gabinetu zestawu
 * (nie na szablonie FiziYo) albo dla wszystkich fizjo (tylko na szablonie FiziYo, D-3).
 */
export function allowedSetNoteVisibilities(params: {
  isFiziyoTeam: boolean;
  isGlobalTemplate: boolean;
}): ExerciseSetLogVisibility[] {
  if (!params.isFiziyoTeam) return ['ORGANIZATION', 'PRIVATE'];
  return params.isGlobalTemplate
    ? ['FIZIYO_ADMINS', 'ALL_THERAPISTS', 'PRIVATE']
    : ['FIZIYO_ADMINS', 'ORGANIZATION', 'PRIVATE'];
}

export function setLogAuthorLabel(entry: Pick<ExerciseSetLogEntry, 'isMine' | 'authorName' | 'kind'>): string {
  if (entry.isMine) return 'Ty';
  return entry.authorName || 'FiziYo';
}

/** Najnowsze na górze: historia czyta się od ostatniej zmiany. */
export function sortSetLogNewestFirst(entries: readonly ExerciseSetLogEntry[]): ExerciseSetLogEntry[] {
  return [...entries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

const VALUE_FIELDS: Record<string, { label: string; unit?: string }> = {
  sets: { label: 'serie' },
  reps: { label: 'powtórzenia' },
  duration: { label: 'czas serii', unit: 's' },
  executionTime: { label: 'czas powtórzenia', unit: 's' },
  preparationTime: { label: 'czas przygotowania', unit: 's' },
  restSets: { label: 'przerwa między seriami', unit: 's' },
  restReps: { label: 'przerwa między powtórzeniami', unit: 's' },
  tempo: { label: 'tempo' },
};

const LABEL_ONLY_FIELDS: Record<string, string> = {
  order: 'kolejność',
  notes: 'notatka dla pacjenta',
  customName: 'własna nazwa',
  customDescription: 'własny opis',
  overridesJson: 'ustawienia ćwiczenia',
  isWarmup: 'rozgrzewka',
  requiresMappingIds: 'wymaga wcześniej',
  dependencyMode: 'tryb zależności',
};

type FieldChange = { before?: unknown; after?: unknown };
type ChangeData = {
  fields?: Record<string, FieldChange>;
  items?: Record<string, { exerciseId?: string; fields?: Record<string, FieldChange> }>;
  added?: string[];
  removed?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseChangeData(data: string | null): ChangeData | null {
  if (!data) return null;
  try {
    const parsed: unknown = JSON.parse(data);
    return isRecord(parsed) ? (parsed as ChangeData) : null;
  } catch {
    return null;
  }
}

function formatValue(value: unknown, unit?: string): string {
  if (value === null || value === undefined || value === '') return '—';
  return unit ? `${String(value)} ${unit}` : String(value);
}

function describeField(field: string, change: FieldChange): string | null {
  const valueField = VALUE_FIELDS[field];
  if (valueField) {
    return `${valueField.label}: ${formatValue(change.before, valueField.unit)} → ${formatValue(change.after, valueField.unit)}`;
  }
  return LABEL_ONLY_FIELDS[field] ?? null;
}

function names(ids: readonly string[] | undefined, exerciseNames: ReadonlyMap<string, string>): string {
  return (ids ?? []).map((id) => exerciseNames.get(id) ?? 'ćwiczenie spoza zestawu').join(', ');
}

/**
 * Szczegóły wpisu „Zmiany”: jedna linia na zmianę, z nazwą ćwiczenia z zestawu. Ćwiczenie już usunięte
 * z zestawu nie ma nazwy w odpowiedzi, więc dostaje opis zastępczy.
 */
export function describeSetContentChange(
  data: string | null,
  exerciseNames: ReadonlyMap<string, string>
): string[] {
  const change = parseChangeData(data);
  if (!change) return [];
  const lines: string[] = [];

  const name = change.fields?.name;
  if (name) lines.push(`Nazwa: ${formatValue(name.before)} → ${formatValue(name.after)}`);
  if (change.fields?.description) lines.push('Zmieniony opis');
  if (change.fields?.assignmentOverrides) lines.push('Zmienione dawki w przypisaniu pacjenta');
  if (change.added?.length) lines.push(`Dodane: ${names(change.added, exerciseNames)}`);
  if (change.removed?.length) lines.push(`Usunięte: ${names(change.removed, exerciseNames)}`);

  for (const item of Object.values(change.items ?? {})) {
    const parts = Object.entries(item.fields ?? {})
      .map(([field, fieldChange]) => describeField(field, fieldChange))
      .filter((part): part is string => part !== null);
    if (parts.length === 0) continue;
    const exerciseName = (item.exerciseId && exerciseNames.get(item.exerciseId)) || 'Ćwiczenie spoza zestawu';
    lines.push(`${exerciseName}: ${parts.join(', ')}`);
  }
  return lines;
}

/** Historia sięga dni i tygodni wstecz: poza dzisiejszymi wpisami zawsze z datą. */
export function formatSetLogTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `dziś, ${time}`;
  return `${date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${time}`;
}
