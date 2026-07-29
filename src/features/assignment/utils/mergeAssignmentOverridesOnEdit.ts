import type { ExerciseOverrideFields } from '@/components/shared/exercise/exerciseOverride';
import {
  parseOverrideMap,
  stringifyOverrideMap,
  type OverrideMap,
} from '@/components/shared/exercise/exercisePersonalizationWriter';
import { mergeEnrichmentOverrides } from '@/components/shared/exercise/enrichmentOverride';

/**
 * Dosage/content fields that live on ExerciseSetMapping columns after wizard edit.
 * Leaving them in assignment.exerciseOverrides would shadow the fresh mapping values.
 */
export const MAPPING_OWNED_OVERRIDE_KEYS = [
  'sets',
  'reps',
  'duration',
  'executionTime',
  'restSets',
  'restReps',
  'preparationTime',
  'tempo',
  'loadWeightKg',
  'load',
  'notes',
  'customName',
  'customDescription',
] as const satisfies ReadonlyArray<keyof ExerciseOverrideFields>;

export interface MergeAssignmentOverridesOnEditInput {
  existingJson: string | null | undefined;
  /** Clinical/enrichment deltas keyed by mapping.id from the builder. */
  clinicalByMappingId: Record<string, ExerciseOverrideFields>;
  /** Mapping IDs still present in the plan after edit. */
  activeMappingIds: Iterable<string>;
  /**
   * Mapping IDs whose dosage columns were just written via updateExerciseInSet /
   * addExerciseToSet — strip shadowing dosage keys from their override entries.
   */
  mappingIdsWithWrittenDosage: Iterable<string>;
}

function stripMappingOwnedKeys(entry: ExerciseOverrideFields): ExerciseOverrideFields {
  const next: ExerciseOverrideFields = { ...entry };
  for (const key of MAPPING_OWNED_OVERRIDE_KEYS) {
    delete next[key];
  }
  return next;
}

function mergeEntry(
  previous: ExerciseOverrideFields | undefined,
  clinical: ExerciseOverrideFields | undefined,
  stripDosage: boolean
): ExerciseOverrideFields | undefined {
  const base = stripDosage && previous ? stripMappingOwnedKeys(previous) : { ...(previous ?? {}) };
  if (!clinical || Object.keys(clinical).length === 0) {
    return Object.keys(base).length > 0 ? base : undefined;
  }

  const enrichment = mergeEnrichmentOverrides(base.enrichment, clinical.enrichment);
  const { enrichment: _prevEnrichment, ...baseScalars } = base;
  const { enrichment: _clinicalEnrichment, ...clinicalScalars } = clinical;
  const merged: ExerciseOverrideFields = {
    ...baseScalars,
    ...clinicalScalars,
    ...(enrichment ? { enrichment } : {}),
  };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Merge wizard clinical deltas into existing assignment.exerciseOverrides without
 * wiping unrelated keys (hidden, customImages, dosage from EditExerciseOverrideDialog).
 * Always returns a JSON string so callers can clear shadowing entries when needed.
 */
export function mergeAssignmentOverridesOnEdit(
  input: MergeAssignmentOverridesOnEditInput
): string {
  const map: OverrideMap = parseOverrideMap(input.existingJson);
  const activeIds = new Set(input.activeMappingIds);
  const dosageWritten = new Set(input.mappingIdsWithWrittenDosage);

  for (const key of Object.keys(map)) {
    if (!activeIds.has(key)) {
      delete map[key];
    }
  }

  for (const mappingId of activeIds) {
    const merged = mergeEntry(
      map[mappingId],
      input.clinicalByMappingId[mappingId],
      dosageWritten.has(mappingId)
    );
    if (merged) {
      map[mappingId] = merged;
    } else {
      delete map[mappingId];
    }
  }

  return stringifyOverrideMap(map);
}
