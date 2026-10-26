import { calculateExerciseTotalSeconds } from '@/utils/exerciseTime';

export type ExecutionMode = 'reps' | 'hold';

export type ParameterKey = 'sets' | 'reps' | 'repTime' | 'hold' | 'rest';

export type ParameterLevel = 'ok' | 'empty' | 'default' | 'warning' | 'acknowledged' | 'limit';

export type FindingLevel = 'limit' | 'warning';

/** What the therapist can confirm with „Tak ma być”: an unusual field or a long (not over-limit) exercise. */
export type AcknowledgeKey = ParameterKey | 'session';

export interface ParameterRule {
  label: string;
  unit: string;
  hardMax: number;
  typicalMin: number;
  typicalMax: number;
  suggested: number;
}

/**
 * Starting ranges agreed for the verification screen. They are product assumptions,
 * not medical norms: physiotherapists own these numbers and may tune them.
 */
export const PARAMETER_RULES: Record<ParameterKey, ParameterRule> = {
  sets: { label: 'Serie', unit: '', hardMax: 20, typicalMin: 2, typicalMax: 5, suggested: 3 },
  reps: { label: 'Powtórzenia', unit: '', hardMax: 200, typicalMin: 6, typicalMax: 20, suggested: 12 },
  repTime: { label: 'Czas powtórzenia', unit: 's', hardMax: 60, typicalMin: 2, typicalMax: 6, suggested: 3 },
  hold: { label: 'Czas utrzymania', unit: 's', hardMax: 300, typicalMin: 10, typicalMax: 60, suggested: 30 },
  rest: { label: 'Przerwa między seriami', unit: 's', hardMax: 600, typicalMin: 30, typicalMax: 120, suggested: 60 },
};

export const MODE_PARAMETERS: Record<ExecutionMode, ParameterKey[]> = {
  reps: ['sets', 'reps', 'repTime', 'rest'],
  hold: ['sets', 'hold', 'rest'],
};

export const DEFAULT_REP_SECONDS = 3;
export const SESSION_WARNING_SECONDS = 15 * 60;
export const SESSION_LIMIT_SECONDS = 60 * 60;
const HOLD_MODE_MIN_SECONDS = 10;

export interface ParameterSource {
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

export interface ParameterFinding {
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
      reps: null,
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

export interface ModeCoreValues {
  reps: number | null;
  executionTime: number | null;
}

export type ModeStash = Partial<Record<ExecutionMode, ModeCoreValues>>;

export interface PlanModeSwitchInput {
  current: ModeCoreValues & { duration?: number | null };
  from: ExecutionMode;
  to: ExecutionMode;
  stash: ModeStash;
  /** The current mode has no saved values yet (hold picked, seconds not entered). */
  isCurrentPending?: boolean;
}

export interface ModeSwitchPlan {
  /** Values to write; null means nothing is saved until the therapist enters the hold time. */
  values: ModeCoreValues | null;
  stash: ModeStash;
}

/**
 * Switching modes must never autosave a half-filled record (e.g. reps: 1 with the old 3 s)
 * and a mistaken click must be reversible, so each mode remembers its last values.
 */
export function planModeSwitch({
  current,
  from,
  to,
  stash,
  isCurrentPending = false,
}: PlanModeSwitchInput): ModeSwitchPlan {
  const nextStash: ModeStash = isCurrentPending
    ? stash
    : { ...stash, [from]: { reps: current.reps, executionTime: current.executionTime } };
  const remembered = stash[to];
  if (remembered) return { values: remembered, stash: nextStash };
  if (to === 'hold') {
    const holdSeconds =
      (current.executionTime ?? 0) >= HOLD_MODE_MIN_SECONDS ? current.executionTime : positive(current.duration);
    return { values: holdSeconds ? { reps: 1, executionTime: holdSeconds } : null, stash: nextStash };
  }
  return { values: { reps: null, executionTime: DEFAULT_REP_SECONDS }, stash: nextStash };
}

/** Fields outside the parameter tile that still drive the patient timer. */
export interface SessionTiming {
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
  acknowledged: ReadonlySet<ParameterKey>
): { field: ParameterFieldState; finding: ParameterFinding | null } {
  const rule = PARAMETER_RULES[key];
  const value = values[key];

  if (isEmpty(key, value)) {
    if (!isRequired(key, values)) {
      return { field: { key, value: null, level: key === 'repTime' ? 'default' : 'empty' }, finding: null };
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

export interface EvaluateParametersInput {
  values: ParameterValues;
  mode: ExecutionMode;
  side: string;
  acknowledged?: ReadonlySet<ParameterKey>;
  /** Session length the therapist confirmed with „Tak ma być”; any change in seconds reopens it. */
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
    const { field, finding } = evaluateField(key, values, acknowledged);
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
      text: `Całe ćwiczenie trwałoby około ${formatSessionDuration(sessionSeconds)}. W planie to zwykle 3–10 min.`,
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
