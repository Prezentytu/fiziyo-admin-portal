/**
 * Strona, cel i zakresy dawki rekordu 3.3 (`side`, `prescription`) edytowane w etapie Parametry.
 * Macierz FR-007 oznacza je w weryfikacji jako edytowalne; zapis idzie całą sekcją przez `writeExerciseContent`.
 *
 * Strona ma dwa miejsca: kolumnę `side` (steruje odtwarzaczem pacjenta) i `side.mode` w dokumencie
 * (KONTRAKT-v3.3 §1: kolumna niesie sam tryb). Jedna kontrolka zmienia oba naraz, więc się nie rozjeżdżają.
 */
import type { ExerciseRanges, ParameterKey } from './parameterRules';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// ---------- Słowniki (fiziyo-research/youtube-video-kb/catalog/_schema/parameters.json) ----------

/** `prescription.goal`: lista celów kontraktu z etykietą dla fizjoterapeuty. */
export const PRESCRIPTION_GOALS = [
  { code: 'strength', label: 'Siła' },
  { code: 'hypertrophy', label: 'Masa mięśniowa' },
  { code: 'endurance', label: 'Wytrzymałość mięśniowa' },
  { code: 'power', label: 'Moc' },
  { code: 'mobility', label: 'Mobilność' },
  { code: 'stretch', label: 'Rozciąganie' },
  { code: 'balance', label: 'Równowaga' },
  { code: 'motor_control', label: 'Kontrola ruchu' },
  { code: 'analgesic_isometric', label: 'Izometria przeciwbólowa' },
  { code: 'tendon_loading', label: 'Obciążanie ścięgna' },
  { code: 'pfmt', label: 'Mięśnie dna miednicy' },
  { code: 'aerobic', label: 'Wydolność tlenowa' },
  { code: 'breathing', label: 'Oddychanie' },
  { code: 'relaxation', label: 'Rozluźnienie' },
  { code: 'vestibular_habituation', label: 'Habituacja przedsionkowa' },
] as const;

/** `prescription.params.rom.default`. */
export const PRESCRIPTION_ROM = [
  { code: 'pain_free', label: 'W wygodnym zakresie, bez ostrego bólu' },
  { code: 'partial', label: 'W niepełnym zakresie' },
  { code: 'mid', label: 'W środkowym zakresie' },
  { code: 'full', label: 'W pełnym wygodnym zakresie' },
  { code: 'end', label: 'Do końca zakresu, bez forsowania' },
] as const;

export function goalLabel(code: string | null): string | null {
  if (!code) return null;
  return PRESCRIPTION_GOALS.find((goal) => goal.code === code)?.label ?? code;
}

export function romLabel(code: string | null): string | null {
  if (!code) return null;
  return PRESCRIPTION_ROM.find((rom) => rom.code === code)?.label ?? code;
}

// ---------- Strona ----------

/** Kolumna `side` → `side.mode` dokumentu. */
const MODE_BY_COLUMN: Record<string, string> = {
  none: 'none',
  both: 'each_side',
  alternating: 'alternating',
  left: 'left',
  right: 'right',
};

/**
 * Sekcja `side` po zmianie strony w kafelku. Przy stronach liczba jest zawsze na stronę (KONTRAKT-v3.3 §6.7),
 * więc `per_side_dose` idzie za trybem. Strona w mediach zostaje.
 */
export function sideForColumn(side: unknown, column: string): UnknownRecord {
  const mode = MODE_BY_COLUMN[column.trim().toLowerCase()] ?? 'none';
  const perSide = mode === 'each_side' || mode === 'alternating';
  const current = asRecord(side) ?? {};
  return { ...current, mode, per_side_dose: perSide };
}

// ---------- Zakresy dawki ----------

/** Klucz `prescription.params` → pole kafla parametrów. */
export const RANGE_KEYS: ReadonlyArray<{ key: string; label: string; unit: string; field?: ParameterKey }> = [
  { key: 'sets', label: 'Serie', unit: '', field: 'sets' },
  { key: 'reps', label: 'Powtórzenia', unit: '', field: 'reps' },
  { key: 'rep_s', label: 'Czas powtórzenia', unit: 's', field: 'repTime' },
  { key: 'hold_s', label: 'Utrzymanie', unit: 's', field: 'hold' },
  { key: 'rest_sets_s', label: 'Przerwa między seriami', unit: 's', field: 'rest' },
  { key: 'rest_reps_s', label: 'Przerwa między powtórzeniami', unit: 's' },
  { key: 'prep_s', label: 'Przygotowanie', unit: 's' },
];

export interface RangeValue {
  min: number | null;
  max: number | null;
  default: number | null;
}

export function readRange(prescription: unknown, key: string): RangeValue {
  const range = asRecord(asRecord(asRecord(prescription)?.params)?.[key]);
  return { min: asNumber(range?.min), max: asNumber(range?.max), default: asNumber(range?.default) };
}

function withParams(prescription: unknown, update: (params: UnknownRecord) => UnknownRecord): UnknownRecord {
  const current = asRecord(prescription) ?? {};
  return { ...current, params: update({ ...(asRecord(current.params) ?? {}) }) };
}

/** Zmienia jedną granicę zakresu; pusta wartość usuwa granicę, pusty zakres znika z `params`. */
export function prescriptionWithBound(
  prescription: unknown,
  key: string,
  bound: 'min' | 'max',
  value: number | null
): UnknownRecord {
  return withParams(prescription, (params) => {
    const range: UnknownRecord = { ...(asRecord(params[key]) ?? {}) };
    if (value == null) delete range[bound];
    else range[bound] = value;
    if (Object.keys(range).length === 0) delete params[key];
    else params[key] = range;
    return params;
  });
}

/** Słowna wartość domyślna (tempo, zakres ruchu); pusta usuwa klucz. */
export function prescriptionWithDefaultWord(prescription: unknown, key: 'tempo' | 'rom', value: string): UnknownRecord {
  return withParams(prescription, (params) => {
    const range: UnknownRecord = { ...(asRecord(params[key]) ?? {}) };
    const trimmed = value.trim();
    if (trimmed === '') delete range.default;
    else range.default = trimmed;
    if (Object.keys(range).length === 0) delete params[key];
    else params[key] = range;
    return params;
  });
}

export function prescriptionWithGoal(prescription: unknown, goal: string | null): UnknownRecord {
  const next: UnknownRecord = { ...(asRecord(prescription) ?? {}) };
  if (goal) next.goal = goal;
  else delete next.goal;
  return next;
}

export interface PrescriptionStep {
  criterion: string;
  next: string[];
}

export function readStep(prescription: unknown, which: 'progression' | 'regression'): PrescriptionStep {
  const step = asRecord(asRecord(prescription)?.[which]);
  return {
    criterion: typeof step?.criterion === 'string' ? step.criterion : '',
    next: Array.isArray(step?.next) ? step.next.filter((item): item is string => typeof item === 'string') : [],
  };
}

/** Kryterium i kolejne kroki progresji albo regresji; pusty krok znika z dokumentu. */
export function prescriptionWithStep(
  prescription: unknown,
  which: 'progression' | 'regression',
  step: PrescriptionStep
): UnknownRecord {
  const next: UnknownRecord = { ...(asRecord(prescription) ?? {}) };
  const value: UnknownRecord = { ...(asRecord(next[which]) ?? {}) };
  if (step.criterion.trim() === '') delete value.criterion;
  else value.criterion = step.criterion;
  if (step.next.length === 0) delete value.next;
  else value.next = step.next;
  if (Object.keys(value).length === 0) delete next[which];
  else next[which] = value;
  return next;
}

/**
 * Zakresy ćwiczenia dla sugestii kafla: tylko pełny zakres (min i max). „Ustaw …” proponuje wartość domyślną
 * z dokumentu, gdy mieści się w zakresie, inaczej dolną granicę.
 */
export function exerciseRangesOf(prescription: unknown): ExerciseRanges {
  const ranges: ExerciseRanges = {};
  for (const { key, field } of RANGE_KEYS) {
    if (!field) continue;
    const { min, max, default: preset } = readRange(prescription, key);
    if (min == null || max == null || min > max) continue;
    ranges[field] = { min, max, suggested: preset != null && preset >= min && preset <= max ? preset : min };
  }
  return ranges;
}
