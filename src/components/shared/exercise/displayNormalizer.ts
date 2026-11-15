import { normalizeExerciseSide } from '@/utils/exerciseEnums';
import { formatLoad } from '@/utils/loadParser';
import type { ExerciseLoad } from '@/features/assignment/types';
import { isV33ExerciseRecord } from '@/utils/exerciseRecordVersion';
import type { ExerciseFieldValueSource } from './displayRegistry';

interface ExerciseSourceLike {
  side?: string | null;
  exerciseSide?: string | null;
  preparationTime?: number | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  resistance?: string | null;
  equipment?: string | null;
  difficultyLevel?: string | null;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
  audioCue?: string | null;
  notes?: string | null;
  loadText?: string | null;
  defaultLoad?: ExerciseLoad | null;
  loadType?: string | null;
  loadValue?: number | null;
  loadUnit?: string | null;
  /** Dokument treści i wersja rekordu: z nich wynika, czy „naprzemiennie” liczy się na stronę. */
  enrichmentData?: unknown;
  schemaVersion?: string | number | null;
}

interface ExerciseDefaultSourceLike extends ExerciseSourceLike {
  defaultSets?: number | null;
  defaultReps?: number | null;
  defaultDuration?: number | null;
  defaultExecutionTime?: number | null;
  defaultRestBetweenSets?: number | null;
  defaultRestBetweenReps?: number | null;
}

function toOptionalNumber(value?: number | null): number | undefined {
  return value == null ? undefined : value;
}

function toOptionalString(value?: string | null): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function buildScalarLoad(source: ExerciseSourceLike): ExerciseLoad | undefined {
  const defaultLoadWeightKg = source.defaultLoad?.loadWeightKg;
  const hasScalarLoad =
    defaultLoadWeightKg != null ||
    source.loadValue != null ||
    source.loadType != null ||
    source.loadUnit != null ||
    source.loadText != null;
  if (!hasScalarLoad) return undefined;

  const normalizedType: ExerciseLoad['type'] =
    source.loadType === 'band' || source.loadType === 'bodyweight' || source.loadType === 'other'
      ? source.loadType
      : 'weight';
  const normalizedUnit: ExerciseLoad['unit'] =
    source.loadUnit === 'kg' || source.loadUnit === 'lbs' || source.loadUnit === 'level'
      ? source.loadUnit
      : defaultLoadWeightKg != null
        ? 'kg'
        : undefined;
  const value = source.loadValue ?? defaultLoadWeightKg ?? undefined;
  const loadTextFromValue =
    value == null ? '' : `${value}${normalizedUnit ? ` ${normalizedUnit}` : ''}`.trim();

  return {
    loadWeightKg: defaultLoadWeightKg ?? null,
    loadSource: source.defaultLoad?.loadSource ?? null,
    type: normalizedType,
    value,
    unit: normalizedUnit,
    text: source.loadText?.trim() || loadTextFromValue || 'Obciążenie',
  };
}

export function resolveLoadDisplayText(source: ExerciseSourceLike): string | undefined {
  const normalizedLoadText = toOptionalString(source.loadText);
  if (normalizedLoadText) return normalizedLoadText;

  const parsedLoad = source.defaultLoad ?? buildScalarLoad(source);
  const formattedLoad = parsedLoad ? formatLoad(parsedLoad) : '';
  return formattedLoad || undefined;
}

function readDocument(enrichmentData: unknown): Record<string, unknown> | null {
  let document = enrichmentData;
  if (typeof document === 'string') {
    try {
      document = JSON.parse(document) as unknown;
    } catch {
      return null;
    }
  }
  return document && typeof document === 'object' ? (document as Record<string, unknown>) : null;
}

/**
 * Sprzęt rekordu 3.3 z `equipment_items` dokumentu (P-3a): nowy rekord nie ma starej kolumny `equipment`.
 * Etykieta pozycji, a bez niej kod; puste pozycje pomijamy.
 */
function equipmentItemsText(document: Record<string, unknown> | null): string | undefined {
  const items = document?.equipment_items;
  if (!Array.isArray(items)) return undefined;
  const labels = items
    .map((item) => {
      if (!item || typeof item !== 'object') return undefined;
      const { label, code } = item as { label?: unknown; code?: unknown };
      return toOptionalString(typeof label === 'string' ? label : typeof code === 'string' ? code : undefined);
    })
    .filter((label): label is string => label !== undefined);
  return labels.length > 0 ? labels.join(', ') : undefined;
}

/** Zakres powtórzeń z `prescription.params.reps` rekordu 3.3 (P-3c); tylko gdy min < max. */
function prescriptionRepsRange(document: Record<string, unknown> | null): { min: number; max: number } | undefined {
  const prescription = document?.prescription;
  if (!prescription || typeof prescription !== 'object') return undefined;
  const params = (prescription as { params?: unknown }).params;
  if (!params || typeof params !== 'object') return undefined;
  const reps = (params as { reps?: unknown }).reps;
  if (!reps || typeof reps !== 'object') return undefined;
  const { min, max } = reps as { min?: unknown; max?: unknown };
  return typeof min === 'number' && typeof max === 'number' && min > 0 && min < max ? { min, max } : undefined;
}

export function normalizeExerciseFieldValues(source: ExerciseDefaultSourceLike): ExerciseFieldValueSource {
  const isV33 = isV33ExerciseRecord(source);
  const document = isV33 ? readDocument(source.enrichmentData) : null;
  const repsRange = prescriptionRepsRange(document);
  return {
    // GraphQL `Exercise` ma tylko pola `default*` (bez `sets`/`restSets`).
    sets: toOptionalNumber(source.defaultSets),
    reps: toOptionalNumber(source.defaultReps),
    duration: toOptionalNumber(source.defaultDuration),
    executionTime: toOptionalNumber(source.defaultExecutionTime),
    restSets: toOptionalNumber(source.defaultRestBetweenSets),
    restReps: toOptionalNumber(source.defaultRestBetweenReps),
    preparationTime: toOptionalNumber(source.preparationTime),
    tempo: toOptionalString(source.tempo),
    loadDisplayText: resolveLoadDisplayText(source),
    side: normalizeExerciseSide(source.side ?? source.exerciseSide),
    rangeOfMotion: toOptionalString(source.rangeOfMotion),
    resistance: toOptionalString(source.resistance),
    equipment: toOptionalString(source.equipment) ?? equipmentItemsText(document),
    difficultyLevel: toOptionalString(source.difficultyLevel),
    patientDescription: toOptionalString(source.patientDescription ?? source.description),
    clinicalDescription: toOptionalString(source.clinicalDescription),
    audioCue: toOptionalString(source.audioCue),
    notes: toOptionalString(source.notes),
    ...(isV33 ? { alternatingPerSide: true } : {}),
    ...(repsRange ? { repsRange } : {}),
  };
}
