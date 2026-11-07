import type { ExerciseSuggestionResponse } from '@/types/ai.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { computeCompleteness } from '@/features/verification/utils/enrichmentSkeleton';
import { compactEnrichment } from '@/features/verification/utils/enrichment';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import { aiSuggestionLoadKg, aiSuggestionSide, applyAiSuggestionParams } from './aiSuggestionParams';
import { deepMergeFillGaps, revertUnchangedAiValues } from './enrichmentFillGaps';

// ============================================================
// Warianty nazwy (krok 1: „wpisz, czego potrzebujesz”)
// ============================================================

export type AiExerciseSide = 'none' | 'left' | 'right' | 'both' | 'alternating';
export type AiExerciseLevel = 'easy' | 'medium' | 'hard' | 'expert' | 'unknown';

export interface AiExerciseVariant {
  name: string;
  position: string | null;
  equipment: string | null;
  side: AiExerciseSide;
  level: AiExerciseLevel;
}

export const MAX_AI_VARIANTS = 6;
const MAX_VARIANT_NAME_LENGTH = 200;
const SIDES: readonly AiExerciseSide[] = ['none', 'left', 'right', 'both', 'alternating'];
const LEVELS: readonly AiExerciseLevel[] = ['easy', 'medium', 'hard', 'expert', 'unknown'];

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== 'null' ? trimmed : null;
}

function readToken<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const token = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (allowed as readonly string[]).includes(token) ? (token as T) : fallback;
}

/**
 * Granica odpowiedzi `/api/ai/exercise-variants`: odrzuca wpisy bez nazwy, za długie i duplikaty
 * (bez względu na wielkość liter), nieznaną stronę i poziom sprowadza do `none` / `unknown`.
 */
export function normalizeAiExerciseVariants(raw: unknown): AiExerciseVariant[] {
  const list = raw && typeof raw === 'object' ? (raw as { variants?: unknown }).variants : undefined;
  if (!Array.isArray(list)) return [];

  const seen = new Set<string>();
  const result: AiExerciseVariant[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = readString(record.name)?.replace(/\.+$/, '').trim() ?? '';
    const key = name.toLocaleLowerCase('pl');
    if (name.length < 2 || name.length > MAX_VARIANT_NAME_LENGTH || seen.has(key)) continue;
    seen.add(key);
    result.push({
      name,
      position: readString(record.position),
      equipment: readString(record.equipment),
      side: readToken(record.side, SIDES, 'none'),
      level: readToken(record.level, LEVELS, 'unknown'),
    });
    if (result.length === MAX_AI_VARIANTS) break;
  }
  return result;
}

const LEVEL_TO_DIFFICULTY: Record<AiExerciseLevel, string | null> = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD',
  expert: 'EXPERT',
  unknown: null,
};

const LEVEL_LABEL: Record<AiExerciseLevel, string | null> = {
  easy: 'Łatwy',
  medium: 'Średni',
  hard: 'Trudny',
  expert: 'Ekspert',
  unknown: null,
};

const SIDE_LABEL: Record<AiExerciseSide, string | null> = {
  none: null,
  both: 'Na każdą stronę',
  left: 'Tylko lewa',
  right: 'Tylko prawa',
  alternating: 'Naprzemiennie',
};

/** Cechy wariantu do pokazania pod nazwą (pozycja, sprzęt, strona, poziom), bez pustych. */
export function aiVariantAttributes(variant: AiExerciseVariant): string[] {
  return [variant.position, variant.equipment, SIDE_LABEL[variant.side], LEVEL_LABEL[variant.level]].filter(
    (value): value is string => Boolean(value)
  );
}

// ============================================================
// Całe ćwiczenie jednym ruchem (krok 2)
// ============================================================

/** Pola kreatora, które wypełnia „Wypełnij całe ćwiczenie”. */
export interface AiFullExerciseTarget {
  name: string;
  description: string;
  exerciseSide: AiExerciseSide;
  difficultyLevel: string;
  sets: number | null;
  reps: number | null;
  restSets: number | null;
  preparationTime: number | null;
  executionTime: number | null;
  tempo: string;
  loadKg: number | null;
  rangeOfMotion: string;
}

type Range = readonly [min: number, max: number];

/** Wartości spoza zakresu traktujemy jak brak: AI nie ustawi 40 serii ani 2 godzin przerwy. */
export const AI_PARAM_RANGES = {
  sets: [1, 10],
  reps: [1, 100],
  duration: [1, 600],
  restSets: [1, 600],
  preparationTime: [1, 60],
  executionTime: [1, 600],
  loadKg: [0.1, 300],
} as const satisfies Record<string, Range>;

function inRange(value: number | null | undefined, [min, max]: Range): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

function sanitizeTempo(tempo: string | null | undefined): string | null {
  const digits = (tempo ?? '').replace(/\D/g, '');
  return /^\d{3,4}$/.test(digits) ? digits : null;
}

function sanitizeText(value: string | null | undefined, maxLength: number): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

/**
 * Sugestia AI po odrzuceniu pustych i absurdalnych wartości (null = „AI nie wie”, pole zostaje).
 * Backend też przycina zakresy, ale panel nie ufa odpowiedzi: model i proxy mogą się zmienić.
 */
export function sanitizeAiSuggestion(suggestion: ExerciseSuggestionResponse): ExerciseSuggestionResponse {
  const advanced = suggestion.advancedParams;
  return {
    ...suggestion,
    sets: inRange(suggestion.sets, AI_PARAM_RANGES.sets) ?? 0,
    reps: inRange(suggestion.reps, AI_PARAM_RANGES.reps),
    duration: inRange(suggestion.duration, AI_PARAM_RANGES.duration),
    restSets: inRange(suggestion.restSets, AI_PARAM_RANGES.restSets) ?? 0,
    advancedParams: advanced
      ? {
          tempo: sanitizeTempo(advanced.tempo),
          weight: advanced.weight,
          rangeOfMotion: sanitizeText(advanced.rangeOfMotion, 100),
          preparationTime: inRange(advanced.preparationTime, AI_PARAM_RANGES.preparationTime),
          executionTime: inRange(advanced.executionTime, AI_PARAM_RANGES.executionTime),
        }
      : null,
  };
}

/** Etykiety tego, co AI wypełniło, w kolejności formularza (do podsumowania pod nazwą). */
export type AiFilledPart =
  | 'nazwa'
  | 'opis'
  | 'podstawowe parametry'
  | 'strona ciała'
  | 'poziom trudności'
  | 'tempo'
  | 'obciążenie'
  | 'zakres ruchu'
  | 'tagi'
  | 'kroki wykonania'
  | 'wskazówki'
  | 'typowe błędy'
  | 'pozostała treść';

export interface AiFullExerciseInput {
  suggestion: ExerciseSuggestionResponse | null;
  variant?: AiExerciseVariant | null;
  /** Values the wizard starts with. Only a field still equal to its default is filled by AI. */
  defaults: AiFullExerciseTarget;
}

export interface AiFullExerciseResult<T extends AiFullExerciseTarget> {
  next: T;
  filled: AiFilledPart[];
}

/**
 * Szkic całego ćwiczenia z sugestii AI i wybranego wariantu. Nic nie zapisuje: wynik trafia do
 * formularza kreatora, a fizjoterapeuta przegląda go i zapisuje sam.
 *
 * - Nazwa: wybrany wariant (wybór fizjoterapeuty), inaczej korekta nazwy z AI.
 * - Każde inne pole AI wypełnia tylko wtedy, gdy ma jeszcze wartość startową kreatora
 *   (`defaults`): wartość wpisana przez fizjoterapeutę zawsze zostaje.
 * - Powtórzenia i czas powtórzenia idą parą (ćwiczenie na czas to `reps = 1` + czas), więc AI
 *   zmienia je tylko, gdy obie mają wartość startową.
 * - Puste i spoza `AI_PARAM_RANGES` wartości AI niczego nie zmieniają.
 * - Strona i poziom: najpierw wariant, potem sugestia; `none`/`unknown` niczego nie nadpisują.
 */
export function buildAiFullExerciseDraft<T extends AiFullExerciseTarget>(
  prev: T,
  input: AiFullExerciseInput
): AiFullExerciseResult<T> {
  const filled: AiFilledPart[] = [];
  const next: T = { ...prev };
  const { defaults } = input;
  const variant = input.variant ?? null;
  const suggestion = input.suggestion ? sanitizeAiSuggestion(input.suggestion) : null;
  const untouched = (key: keyof AiFullExerciseTarget) => prev[key] === defaults[key];

  const name = variant?.name ?? sanitizeText(suggestion?.correctedName, MAX_VARIANT_NAME_LENGTH);
  if (name && name !== prev.name) {
    next.name = name;
    filled.push('nazwa');
  }

  const description = sanitizeText(suggestion?.description, 4000);
  if (description && prev.description.trim().length === 0) {
    next.description = description;
    filled.push('opis');
  }

  if (suggestion) {
    const params = applyAiSuggestionParams(prev, suggestion);
    let paramsChanged = false;
    const single = ['sets', 'restSets', 'preparationTime'] as const;
    for (const key of single) {
      if (untouched(key) && params[key] !== prev[key]) {
        next[key] = params[key];
        paramsChanged = true;
      }
    }
    if (
      untouched('reps') &&
      untouched('executionTime') &&
      (params.reps !== prev.reps || params.executionTime !== prev.executionTime)
    ) {
      next.reps = params.reps;
      next.executionTime = params.executionTime;
      paramsChanged = true;
    }
    if (paramsChanged) filled.push('podstawowe parametry');
  }

  const variantSide = variant && variant.side !== 'none' ? variant.side : null;
  const side =
    variantSide ?? (suggestion ? aiSuggestionSide(suggestion.exerciseSide, prev.exerciseSide) : prev.exerciseSide);
  if (untouched('exerciseSide') && side !== prev.exerciseSide) {
    next.exerciseSide = side;
    filled.push('strona ciała');
  }

  const difficulty = variant ? LEVEL_TO_DIFFICULTY[variant.level] : null;
  if (difficulty && untouched('difficultyLevel') && difficulty !== prev.difficultyLevel) {
    next.difficultyLevel = difficulty;
    filled.push('poziom trudności');
  }

  const advanced = suggestion?.advancedParams;
  if (advanced?.tempo && untouched('tempo') && advanced.tempo !== prev.tempo) {
    next.tempo = advanced.tempo;
    filled.push('tempo');
  }

  const loadKg = inRange(aiSuggestionLoadKg(advanced?.weight), AI_PARAM_RANGES.loadKg);
  if (loadKg !== null && untouched('loadKg') && loadKg !== prev.loadKg) {
    next.loadKg = loadKg;
    filled.push('obciążenie');
  }

  if (advanced?.rangeOfMotion && prev.rangeOfMotion.trim().length === 0) {
    next.rangeOfMotion = advanced.rangeOfMotion;
    filled.push('zakres ruchu');
  }

  return { next, filled };
}

/** „Cofnij” po wypełnieniu: wraca tylko to, co nadal ma wartość z AI; późniejsze ręczne zmiany zostają. */
export function revertAiFill<T>(current: T, before: T, after: T): T {
  return revertUnchangedAiValues(current, before, after) as T;
}

interface MatchableTag {
  id: string;
  name: string;
}

function normalizeTagText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').trim();
}

/** Wybrane tagi plus pasujące tagi z AI (po normalizacji polskich znaków), dopełnione maks. do `limit`. */
export function matchAiSuggestedTagIds(
  suggestedTags: readonly string[] | null | undefined,
  available: readonly MatchableTag[],
  selected: readonly string[],
  limit = 3
): string[] {
  const suggestions = (suggestedTags ?? []).map(normalizeTagText).filter((tag) => tag.length >= 3);
  const matched = available
    .filter((tag) => {
      const name = normalizeTagText(tag.name);
      return name.length >= 3 && suggestions.some((s) => s.includes(name) || name.includes(s));
    })
    .map((tag) => tag.id);
  const added = matched.filter((id, index) => !selected.includes(id) && matched.indexOf(id) === index);
  // The therapist's own tags are never dropped; AI only tops up to the limit.
  return [...selected, ...added.slice(0, Math.max(0, limit - selected.length))];
}

/**
 * Treść dodatkowa z `/api/ai/generate-enrichment` scalona z bieżącym szkicem: AI wypełnia tylko
 * puste sekcje. Zwraca sekcje, które przybyły (kroki, wskazówki, błędy, reszta).
 */
export function mergeAiEnrichment(
  current: ExerciseEnrichmentData,
  aiData: ExerciseEnrichmentData | null | undefined
): { next: ExerciseEnrichmentData; filled: AiFilledPart[] } {
  if (!aiData || typeof aiData !== 'object') return { next: current, filled: [] };

  const merged = compactEnrichment(deepMergeFillGaps(current, toV3(aiData)) as ExerciseEnrichmentData) ?? {};
  const next = toV3(merged);
  const filled: AiFilledPart[] = [];
  const has = (data: ExerciseEnrichmentData, key: 'steps' | 'cues' | 'mistakes') =>
    (data.patient?.[key]?.length ?? 0) > 0;

  if (!has(current, 'steps') && has(next, 'steps')) filled.push('kroki wykonania');
  if (!has(current, 'cues') && has(next, 'cues')) filled.push('wskazówki');
  if (!has(current, 'mistakes') && has(next, 'mistakes')) filled.push('typowe błędy');

  const listed = filled.length;
  const added = computeCompleteness(next).filled - computeCompleteness(current).filled;
  if (added > listed) filled.push('pozostała treść');

  return { next, filled };
}
