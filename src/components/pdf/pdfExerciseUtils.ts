import { getMediaUrl } from '@/utils/mediaUrl';
import { preloadPdfImages } from './pdfImagePreloader';
import type { PDFExercise } from './types';
import {
  resolveEffectiveExerciseParams,
  type EffectiveMappingSource,
} from '@/components/shared/exercise/resolveEffectiveExerciseParams';
import { normalizeExerciseSide, normalizeExerciseType } from '@/utils/exerciseEnums';
import { isV33ExerciseRecord } from '@/utils/exerciseRecordVersion';
import type { ExerciseOverrideFields } from '@/components/shared/exercise/exerciseOverride';
import { parseOverrideMap } from '@/components/shared/exercise/exercisePersonalizationWriter';

export interface ExerciseImageSource {
  thumbnailUrl?: string;
  imageUrl?: string;
  images?: string[];
}

export interface PdfImagePreloadStats {
  total: number;
  loaded: number;
}

export function resolvePdfExerciseImageUrl(exercise: ExerciseImageSource | undefined | null): string | undefined {
  if (!exercise) return undefined;
  return exercise.thumbnailUrl || exercise.imageUrl || exercise.images?.[0] || undefined;
}

/**
 * Rewrites `exercise.imageUrl` in-place to preloaded base64 data URLs.
 * Failed image loads become `undefined` so PDF gracefully falls back to placeholder.
 */
export async function preloadPdfExerciseImages(exercises: PDFExercise[]): Promise<PdfImagePreloadStats> {
  const absoluteImageUrls = exercises
    .map((exercise) => getMediaUrl(exercise.imageUrl))
    .filter((url): url is string => !!url);

  const stats: PdfImagePreloadStats = { total: absoluteImageUrls.length, loaded: 0 };
  if (absoluteImageUrls.length === 0) return stats;

  const dataUrlMap = await preloadPdfImages(absoluteImageUrls);
  stats.loaded = Array.from(dataUrlMap.values()).filter(Boolean).length;

  for (const exercise of exercises) {
    const absoluteImageUrl = getMediaUrl(exercise.imageUrl);
    const dataUrl = absoluteImageUrl ? dataUrlMap.get(absoluteImageUrl) : null;
    exercise.imageUrl = dataUrl ?? undefined;
  }

  return stats;
}

export interface PdfMappingSource extends EffectiveMappingSource {
  order?: number;
  exercise?: EffectiveMappingSource['exercise'] & {
    images?: string[];
  };
}

/**
 * Jedno mapowanie mappingu zestawu na ćwiczenie w PDF.
 * Parametry, typ i strona idą przez `resolveEffectiveExerciseParams`, więc PDF pokazuje
 * te same liczby co karta zestawu, kreator przypisania i podsumowanie.
 * `override` to wpis z `exerciseOverrides` przypisania; wygrywa z mappingiem.
 */
export function toPdfExercise(mapping: PdfMappingSource, override?: ExerciseOverrideFields | null): PDFExercise {
  const exercise = mapping.exercise;
  const effective = resolveEffectiveExerciseParams(mapping, override);
  const type = normalizeExerciseType(exercise?.type);
  // TIME: serie × czas utrzymania; powtórzenia tylko jawne (override, mapping albo ćwiczenie), bez kanonu 10.
  const reps =
    type === 'time' ? (override?.reps ?? mapping.reps ?? exercise?.defaultReps ?? undefined) : effective.reps;
  return {
    id: mapping.id,
    name: exercise?.name || 'Nieznane ćwiczenie',
    description: effective.patientDescription || exercise?.patientDescription || exercise?.description,
    type,
    exerciseSide: normalizeExerciseSide(effective.side),
    alternatingPerSide: isV33ExerciseRecord(exercise),
    imageUrl: effective.customImages?.[0] || resolvePdfExerciseImageUrl(exercise),
    images: effective.customImages?.length ? effective.customImages : exercise?.images,
    notes: effective.notes || undefined,
    sets: effective.sets,
    reps,
    duration: effective.duration,
    executionTime: effective.executionTime,
    restSets: effective.restSets,
    restReps: effective.restReps,
    order: mapping.order,
    customName: effective.customName,
  };
}

/**
 * Ćwiczenia karty pacjenta: mappingi zestawu z nałożonym `exerciseOverrides` przypisania.
 * Ćwiczenia ukryte dla pacjenta (`hidden`) nie trafiają na wydruk, tak jak w aplikacji.
 */
export function toPdfExercises(
  mappings: readonly PdfMappingSource[] | null | undefined,
  exerciseOverridesJson?: string | null
): PDFExercise[] {
  const overrides = parseOverrideMap(exerciseOverridesJson);
  return (mappings ?? []).flatMap((mapping) => {
    const override = overrides[mapping.id];
    if (override?.hidden) return [];
    return [toPdfExercise(mapping, override)];
  });
}
