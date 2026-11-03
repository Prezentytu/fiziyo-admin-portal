import { calculateExerciseTotalSeconds } from '@/utils/exerciseTime';

export type ExecutionMode = 'reps' | 'hold';

export type ParameterKey = 'sets' | 'reps' | 'repTime' | 'hold' | 'rest';

type ParameterLevel = 'ok' | 'empty' | 'default' | 'warning' | 'acknowledged' | 'limit';

type FindingLevel = 'limit' | 'warning';

/** What the therapist can confirm with „OK”: an unusual field or a long (not over-limit) exercise. */
export type AcknowledgeKey = ParameterKey | 'session';

interface ParameterRule {
  label: string;
  unit: string;
  hardMax: number;
  typicalMin: number;
  typicalMax: number;
  suggested: number;
  /** Slider scale. Narrower than `hardMax`, so the typical band is wide enough to drag precisely. */
  slider: { min: number; max: number; step: number };
}

/**
 * Starting ranges agreed for the verification screen. They are product assumptions,
 * not medical norms: physiotherapists own these numbers and may tune them.
 */
export const PARAMETER_RULES: Record<ParameterKey, ParameterRule> = {
  sets: {
    label: 'Serie',
    unit: '',
    hardMax: 20,
    typicalMin: 2,
    typicalMax: 5,
    suggested: 3,
    slider: { min: 1, max: 10, step: 1 },
  },
  reps: {
    label: 'Powtórzenia w serii',
    unit: '',
    hardMax: 200,
    typicalMin: 6,
    typicalMax: 20,
    suggested: 12,
    slider: { min: 1, max: 40, step: 1 },
  },
  repTime: {
    label: 'Czas jednego powtórzenia',
    unit: 's',
    hardMax: 60,
    typicalMin: 2,
    typicalMax: 6,
    suggested: 3,
    slider: { min: 1, max: 15, step: 1 },
  },
  hold: {
    label: 'Czas utrzymania',
    unit: 's',
    hardMax: 300,
    typicalMin: 10,
    typicalMax: 60,
    suggested: 30,
    slider: { min: 5, max: 120, step: 5 },
  },
  rest: {
    label: 'Przerwa między seriami',
    unit: 's',
    hardMax: 600,
    typicalMin: 30,
    typicalMax: 120,
    suggested: 60,
    slider: { min: 0, max: 240, step: 15 },
  },
};

export const MODE_PARAMETERS: Record<ExecutionMode, ParameterKey[]> = {
  reps: ['sets', 'reps', 'repTime', 'rest'],
  hold: ['sets', 'reps', 'hold', 'rest'],
};

export const DEFAULT_REP_SECONDS = 3;
const SESSION_WARNING_SECONDS = 15 * 60;
const SESSION_LIMIT_SECONDS = 60 * 60;
const HOLD_MODE_MIN_SECONDS = 10;

interface ParameterSource {
  sets: number | null;
  reps: number | null;
  executionTime: number | null;
  restSets: number | null;
  duration?: number | null;
  side: string;
}

export interface ParameterValues {
  sets: number | null;
  reps: number | null;
  repTime: number | null;
  hold: number | null;
  rest: number | null;
}

export interface ParameterFieldState {
  key: ParameterKey;
  value: number | null;
  level: ParameterLevel;
}

interface ParameterFinding {
  key: ParameterKey | 'session';
  level: FindingLevel;
  text: string;
  suggested?: number;
  canAcknowledge: boolean;
}

export interface ParameterEvaluation {
  mode: ExecutionMode;
  fields: ParameterFieldState[];
  findings: ParameterFinding[];
  sessionSeconds: number;
  sessionLevel: 'ok' | FindingLevel;
  /** Findings that must be fixed (cannot be acknowledged). */
  blockingCount: number;
}

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

export function sideFactor(side: string): number {
  return side.toLowerCase() === 'both' ? 2 : 1;
}

export function deriveExecutionMode(
  source: Pick<ParameterSource, 'reps' | 'executionTime' | 'duration'>
): ExecutionMode {
  // Mirrors the catalog: executionTime is per repetition (empty reps count as 10 there),
  // while a legacy duration replaces the whole set. Only those two shapes are a hold.
  const executionTime = positive(source.executionTime);
  if (executionTime) return source.reps === 1 && executionTime >= HOLD_MODE_MIN_SECONDS ? 'hold' : 'reps';
  const isSingleOrEmpty = source.reps == null || source.reps <= 1;
  return isSingleOrEmpty && (positive(source.duration) ?? 0) >= HOLD_MODE_MIN_SECONDS ? 'hold' : 'reps';
}

export function toParameterValues(source: ParameterSource, mode: ExecutionMode): ParameterValues {
  if (mode === 'hold') {
    return {
      sets: source.sets,
      reps: source.reps,
      repTime: null,
      hold: positive(source.executionTime) ?? positive(source.duration),
      rest: source.restSets,
    };
  }
  return {
    sets: source.sets,
    reps: source.reps,
    repTime: source.executionTime,
    hold: null,
    rest: source.restSets,
  };
}

interface ModeCoreValues {
  reps: number | null;
  executionTime: number | null;
}

export interface CoreParameterUpdates {
  sets?: number | null;
  reps?: number | null;
  executionTime?: number | null;
  restSets?: number | null;
}

/** Maps a tile field to the exercise fields it writes; a hold is stored as one long repetition. */
export function toCoreUpdates(key: ParameterKey, value: number | null, current: ModeCoreValues): CoreParameterUpdates {
  switch (key) {
    case 'sets':
      return { sets: value };
    case 'reps':
      return { reps: value };
    case 'repTime':
      return { executionTime: value };
    case 'rest':
      return { restSets: value };
    case 'hold':
      return current.reps === 1 ? { executionTime: value } : { executionTime: value, reps: 1 };
  }
}

/**
 * What the therapist confirmed on the parameter tile; not stored on the exercise.
 * The mode is not part of it: one repetition held for 10 s or more is a hold, so it follows the values.
 */
interface ParameterReviewState {
  acknowledged: ReadonlySet<ParameterKey>;
  acknowledgedSessionSeconds: number | null;
}

export function createParameterReview(): ParameterReviewState {
  return { acknowledged: new Set(), acknowledgedSessionSeconds: null };
}

export function reviewValues(source: ParameterSource): ParameterValues {
  return toParameterValues(source, deriveExecutionMode(source));
}

/** An edited field needs a fresh look, so its „OK” no longer applies. */
export function markParameterEdited(review: ParameterReviewState, key: ParameterKey): ParameterReviewState {
  if (!review.acknowledged.has(key)) return review;
  const acknowledged = new Set(review.acknowledged);
  acknowledged.delete(key);
  return { ...review, acknowledged };
}

export function acknowledgeFinding(
  review: ParameterReviewState,
  key: AcknowledgeKey,
  sessionSeconds: number
): ParameterReviewState {
  if (key === 'session') return { ...review, acknowledgedSessionSeconds: sessionSeconds };
  return { ...review, acknowledged: new Set([...review.acknowledged, key]) };
}

/** Fields outside the parameter tile that still drive the patient timer. */
interface SessionTiming {
  tempo?: string | null;
  duration?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
}

/** Delegates to the catalog/player formula so the gate sees exactly what the patient will do. */
export function computeSessionSeconds(
  values: ParameterValues,
  mode: ExecutionMode,
  side: string,
  timing: SessionTiming = {}
): number {
  const sets = positive(values.sets) ?? 0;
  const shared = {
    sets,
    restSets: values.rest ?? undefined,
    preparationTime: timing.preparationTime ?? undefined,
    side,
  };
  if (mode === 'hold') {
    return calculateExerciseTotalSeconds({ ...shared, reps: 1, executionTime: positive(values.hold) ?? 0 }).seconds;
  }
  return calculateExerciseTotalSeconds({
    ...shared,
    reps: positive(values.reps) ?? 0,
    executionTime: positive(values.repTime) ?? undefined,
    duration: timing.duration ?? undefined,
    tempo: timing.tempo ?? undefined,
    restReps: timing.restReps ?? undefined,
    type: 'reps',
  }).seconds;
}

export function formatSessionDuration(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours} h ${minutes} min`;
  }
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Position on the slider track (0–100). Values beyond the slider scale sit at its end. */
export function sliderPercent(key: ParameterKey, value: number): number {
  const { min, max } = PARAMETER_RULES[key].slider;
  return ((clamp(value, min, max) - min) / (max - min)) * 100;
}

/** Slider thumb value; an empty field shows what the patient gets anyway (default or suggested). */
export function toSliderValue(key: ParameterKey, value: number | null): number {
  const rule = PARAMETER_RULES[key];
  const fallback = key === 'repTime' ? DEFAULT_REP_SECONDS : rule.suggested;
  return clamp(value ?? fallback, rule.slider.min, rule.slider.max);
}

export function fromSliderValue(key: ParameterKey, raw: string): number {
  const { min, max, step } = PARAMETER_RULES[key].slider;
  return clamp(Math.round(Number(raw) / step) * step, min, max);
}

export function formatWithUnit(value: number, unit: string): string {
  return unit ? `${value} ${unit}` : String(value);
}

function isRequired(key: ParameterKey, values: ParameterValues): boolean {
  if (key === 'repTime') return false;
  if (key === 'rest') return (values.sets ?? 0) > 1;
  return true;
}

function isEmpty(key: ParameterKey, value: number | null): boolean {
  if (value == null || !Number.isFinite(value)) return true;
  return key !== 'rest' && value <= 0;
}

function evaluateField(
  key: ParameterKey,
  values: ParameterValues,
  acknowledged: ReadonlySet<ParameterKey>,
  mode: ExecutionMode
): { field: ParameterFieldState; finding: ParameterFinding | null } {
  const rule = PARAMETER_RULES[key];
  const value = values[key];

  // A hold is stored as one repetition; that single repetition is the shape, not an unusual count.
  if (mode === 'hold' && key === 'reps') return { field: { key, value, level: 'ok' }, finding: null };

  if (isEmpty(key, value)) {
    if (!isRequired(key, values)) {
      return { field: { key, value: null, level: 'default' }, finding: null };
    }
    return {
      field: { key, value: null, level: 'empty' },
      finding: {
        key,
        level: 'limit',
        text: `${rule.label}: brak wartości.`,
        suggested: rule.suggested,
        canAcknowledge: false,
      },
    };
  }

  const numeric = value as number;
  if (numeric > rule.hardMax) {
    return {
      field: { key, value: numeric, level: 'limit' },
      finding: {
        key,
        level: 'limit',
        text: `${rule.label}: ${formatWithUnit(numeric, rule.unit)}. Maksymalnie ${formatWithUnit(rule.hardMax, rule.unit)}.`,
        suggested: rule.suggested,
        canAcknowledge: false,
      },
    };
  }

  if (numeric < rule.typicalMin || numeric > rule.typicalMax) {
    if (acknowledged.has(key)) {
      return { field: { key, value: numeric, level: 'acknowledged' }, finding: null };
    }
    const range = `${rule.typicalMin}–${formatWithUnit(rule.typicalMax, rule.unit)}`;
    return {
      field: { key, value: numeric, level: 'warning' },
      finding: {
        key,
        level: 'warning',
        text: `${rule.label}: ${formatWithUnit(numeric, rule.unit)}, zwykle ${range}.`,
        suggested: rule.suggested,
        canAcknowledge: true,
      },
    };
  }

  return { field: { key, value: numeric, level: 'ok' }, finding: null };
}

interface EvaluateParametersInput {
  values: ParameterValues;
  mode: ExecutionMode;
  side: string;
  acknowledged?: ReadonlySet<ParameterKey>;
  /** Session length the therapist confirmed with „OK”; any change in seconds reopens it. */
  acknowledgedSessionSeconds?: number | null;
  timing?: SessionTiming;
}

export function evaluateParameters({
  values,
  mode,
  side,
  acknowledged = new Set<ParameterKey>(),
  acknowledgedSessionSeconds = null,
  timing,
}: EvaluateParametersInput): ParameterEvaluation {
  const fields: ParameterFieldState[] = [];
  const findings: ParameterFinding[] = [];

  for (const key of MODE_PARAMETERS[mode]) {
    const { field, finding } = evaluateField(key, values, acknowledged, mode);
    fields.push(field);
    if (finding) findings.push(finding);
  }

  const sessionSeconds = computeSessionSeconds(values, mode, side, timing);
  let sessionLevel: ParameterEvaluation['sessionLevel'] = 'ok';
  if (sessionSeconds > SESSION_LIMIT_SECONDS) sessionLevel = 'limit';
  else if (sessionSeconds > SESSION_WARNING_SECONDS) sessionLevel = 'warning';

  const isSessionAcknowledged = sessionLevel === 'warning' && acknowledgedSessionSeconds === sessionSeconds;
  if (sessionLevel !== 'ok' && !isSessionAcknowledged) {
    findings.push({
      key: 'session',
      level: sessionLevel,
      text: sessionLevel === 'limit' ? 'Ponad godzinę: sprawdź serie i przerwy' : 'Zwykle 3–10 min',
      canAcknowledge: sessionLevel === 'warning',
    });
  }

  const blockingCount = findings.filter((finding) => finding.level === 'limit').length;
  return {
    mode,
    fields,
    findings,
    sessionSeconds,
    sessionLevel,
    blockingCount,
  };
}

/** Short note under a parameter field: the reason in a few words, the action sits in the buttons next to it. */
export function describeFieldNote(field: ParameterFieldState): string {
  const rule = PARAMETER_RULES[field.key];
  const range = `${rule.typicalMin}–${formatWithUnit(rule.typicalMax, rule.unit)}`;
  switch (field.level) {
    case 'empty':
      return 'Puste';
    case 'limit':
      return `Maks. ${formatWithUnit(rule.hardMax, rule.unit)}`;
    case 'warning':
      return `${(field.value ?? 0) < rule.typicalMin ? 'Mało' : 'Dużo'}, zwykle ${range}`;
    case 'acknowledged':
      return `Zostawione poza zakresem ${range}`;
    default:
      return '';
  }
}

export function buildPatientParameterLine(values: ParameterValues, mode: ExecutionMode, side: string): string {
  const sets = positive(values.sets);
  const volume =
    mode === 'reps' ? `${positive(values.reps) ?? '–'} powtórzeń` : `${positive(values.hold) ?? '–'} s utrzymania`;
  const sideText = sideFactor(side) === 2 ? ' na każdą stronę' : '';
  const rest = positive(values.rest);
  const restText = rest ? ` · przerwa ${rest} s` : '';
  return `${sets ?? '–'} serie × ${volume}${sideText}${restText}`;
}

const HARDCODED_NUMBER_PATTERN = /\b(\d+)\s+(powtórze(?:ń|nia|nie)|seri(?:i|e|a)|sekund(?:y|a)?|razy)(?!\p{L})/giu;

function replacementFor(unit: string): string {
  const lower = unit.toLowerCase();
  if (lower.startsWith('powtórze')) return 'zadaną liczbę powtórzeń';
  if (lower.startsWith('seri')) return 'zadaną liczbę serii';
  if (lower.startsWith('sekund')) return 'zadany czas';
  return 'zadaną liczbę razy';
}

/** Numbers baked into patient copy drift from the parameters the therapist sets per patient. */
export function findHardcodedNumbers(text: string): string[] {
  return Array.from(text.matchAll(HARDCODED_NUMBER_PATTERN), (match) => match[0]);
}

export function replaceHardcodedNumbers(text: string): string {
  return text.replace(HARDCODED_NUMBER_PATTERN, (_match, _count: string, unit: string) => replacementFor(unit));
}
