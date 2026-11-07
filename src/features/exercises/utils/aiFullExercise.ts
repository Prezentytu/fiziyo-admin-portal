import type { ExerciseSuggestionResponse } from '@/types/ai.types';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { computeCompleteness } from '@/features/verification/utils/enrichmentSkeleton';
import { compactEnrichment } from '@/features/verification/utils/enrichment';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import { aiSuggestionLoadKg, aiSuggestionSide, applyAiSuggestionParams } from './aiSuggestionParams';
import { deepMergeFillGaps } from './enrichmentFillGaps';

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
}

export interface AiFullExerciseResult<T extends AiFullExerciseTarget> {
  next: T;
  filled: AiFilledPart[];
}

/**
 * Szkic całego ćwiczenia z sugestii AI i wybranego wariantu. Nic nie zapisuje: wynik trafia do
 * formularza kreatora, a fizjoterapeuta przegląda go i zapisuje sam.
 *
 * - Nazwa: wybrany wariant, inaczej korekta nazwy z AI.
 * - Opis: tylko gdy pole jest puste (tekst fizjoterapeuty wygrywa).
 * - Podstawowe parametry: z AI, bo kreator startuje z wartości domyślnych; wartości spoza
 *   `AI_PARAM_RANGES` i puste nie kasują tego, co jest.
 * - Strona i poziom: najpierw wariant, potem sugestia; `none`/`unknown` niczego nie nadpisują.
 */
export function buildAiFullExerciseDraft<T extends AiFullExerciseTarget>(
  prev: T,
  input: AiFullExerciseInput
): AiFullExerciseResult<T> {
  const filled: AiFilledPart[] = [];
  const next: T = { ...prev };
  const variant = input.variant ?? null;
  const suggestion = input.suggestion ? sanitizeAiSuggestion(input.suggestion) : null;

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
    const paramsChanged = (Object.keys(params) as (keyof typeof params)[]).some((key) => params[key] !== prev[key]);
    Object.assign(next, params);
    if (paramsChanged) filled.push('podstawowe parametry');
  }

  const variantSide = variant && variant.side !== 'none' ? variant.side : null;
  const side =
    variantSide ?? (suggestion ? aiSuggestionSide(suggestion.exerciseSide, prev.exerciseSide) : prev.exerciseSide);
  if (side !== prev.exerciseSide) {
    next.exerciseSide = side;
    filled.push('strona ciała');
  }

  const difficulty = variant ? LEVEL_TO_DIFFICULTY[variant.level] : null;
  if (difficulty && difficulty !== prev.difficultyLevel) {
    next.difficultyLevel = difficulty;
    filled.push('poziom trudności');
  }

  const advanced = suggestion?.advancedParams;
  if (advanced?.tempo && advanced.tempo !== prev.tempo) {
    next.tempo = advanced.tempo;
    filled.push('tempo');
  }

  const loadKg = inRange(aiSuggestionLoadKg(advanced?.weight), AI_PARAM_RANGES.loadKg);
  if (loadKg !== null && loadKg !== prev.loadKg) {
    next.loadKg = loadKg;
    filled.push('obciążenie');
  }

  if (advanced?.rangeOfMotion && prev.rangeOfMotion.trim().length === 0) {
    next.rangeOfMotion = advanced.rangeOfMotion;
    filled.push('zakres ruchu');
  }

  return { next, filled };
}

interface MatchableTag {
  id: string;
  name: string;
}

function normalizeTagText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').trim();
}

/** Tagi organizacji pasujące do tagów z AI (po normalizacji polskich znaków), maks. `limit` łącznie z wybranymi. */
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
  return [...new Set([...selected, ...matched])].slice(0, limit);
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
