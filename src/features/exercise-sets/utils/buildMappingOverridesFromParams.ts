import { buildMappingOverridesJson } from '@/components/shared/exercise/mappingOverrides';
import { resolveParamsEnrichmentDelta } from '@/components/shared/exercise/enrichmentOverride';
import type { ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

export interface MappingOverridesTemplateBaseline {
  side?: string | null;
  exerciseSide?: string | null;
  rangeOfMotion?: string | null;
  resistance?: string | null;
  equipment?: string | null;
  difficultyLevel?: string | null;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
  audioCue?: string | null;
  enrichmentData?: ExerciseEnrichmentData | null;
}

/**
 * Build overridesJson for TEMPLATE set mapping from builder params vs exercise template.
 * Returns null when empty (clear mapping overrides).
 */
export function buildMappingOverridesFromParams(
  template: MappingOverridesTemplateBaseline | undefined,
  params: ExerciseParams
): string | null {
  const enrichmentDelta = resolveParamsEnrichmentDelta(template?.enrichmentData, params);
  return buildMappingOverridesJson(
    {
      side: template?.side ?? template?.exerciseSide ?? undefined,
      exerciseSide: template?.exerciseSide ?? template?.side ?? undefined,
      rangeOfMotion: template?.rangeOfMotion ?? undefined,
      resistance: template?.resistance ?? undefined,
      equipment: template?.equipment ?? undefined,
      difficultyLevel: template?.difficultyLevel ?? undefined,
      patientDescription: template?.patientDescription ?? template?.description ?? undefined,
      clinicalDescription: template?.clinicalDescription ?? undefined,
      audioCue: template?.audioCue ?? undefined,
    },
    // Pole bez wartości w params nie jest ruszone; inaczej buildOverrideDelta zapisze je jako wyczyszczone.
    {
      ...(params.exerciseSide !== undefined ? { side: params.exerciseSide } : {}),
      ...(params.rangeOfMotion !== undefined ? { rangeOfMotion: params.rangeOfMotion } : {}),
      ...(params.resistance !== undefined ? { resistance: params.resistance } : {}),
      ...(params.equipment !== undefined ? { equipment: params.equipment } : {}),
      ...(params.difficultyLevel !== undefined ? { difficultyLevel: params.difficultyLevel } : {}),
      ...(params.patientDescription !== undefined ? { patientDescription: params.patientDescription } : {}),
      ...(params.clinicalDescription !== undefined ? { clinicalDescription: params.clinicalDescription } : {}),
      ...(params.audioCue !== undefined ? { audioCue: params.audioCue } : {}),
    },
    enrichmentDelta
  );
}
