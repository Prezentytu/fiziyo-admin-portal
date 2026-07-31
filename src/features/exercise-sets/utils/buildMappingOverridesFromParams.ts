import { buildMappingOverridesJson } from '@/components/shared/exercise/mappingOverrides';
import { buildEnrichmentOverrideDelta } from '@/components/shared/exercise/enrichmentOverride';
import type { ExerciseParams } from '@/components/shared/ExerciseSetBuilder';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

export interface MappingOverridesTemplateBaseline {
  side?: string | null;
  exerciseSide?: string | null;
  rangeOfMotion?: string | null;
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
  const enrichmentDelta = buildEnrichmentOverrideDelta(
    template?.enrichmentData,
    params.enrichment
  );
  return buildMappingOverridesJson(
    {
      side: template?.side ?? template?.exerciseSide ?? undefined,
      exerciseSide: template?.exerciseSide ?? template?.side ?? undefined,
      rangeOfMotion: template?.rangeOfMotion ?? undefined,
      difficultyLevel: template?.difficultyLevel ?? undefined,
      patientDescription: template?.patientDescription ?? template?.description ?? undefined,
      clinicalDescription: template?.clinicalDescription ?? undefined,
      audioCue: template?.audioCue ?? undefined,
    },
    {
      side: params.exerciseSide,
      rangeOfMotion: params.rangeOfMotion,
      difficultyLevel: params.difficultyLevel,
      patientDescription: params.patientDescription,
      clinicalDescription: params.clinicalDescription,
      audioCue: params.audioCue,
    },
    enrichmentDelta
  );
}
