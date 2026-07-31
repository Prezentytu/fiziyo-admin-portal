/**
 * Mapping-level overridesJson helpers (SPEC-023 / SPEC-024).
 * Same JSON shape as assignment exerciseOverrides subset for classification/content/enrichment.
 */

import type { ExerciseOverrideFields } from './exerciseOverride';
import {
  buildOverrideDelta,
  type InheritedBaseline,
  type PersonalizationPatch,
} from './exercisePersonalizationWriter';
import {
  hasEnrichmentOverrideContent,
  mergeEnrichmentOverrides,
  parseEnrichmentOverride,
  type EnrichmentOverride,
} from './enrichmentOverride';

/** Keys persisted on ExerciseSetMapping.overridesJson (not dosage columns). */
export const MAPPING_OVERRIDES_JSON_KEYS = [
  'exerciseSide',
  'rangeOfMotion',
  'difficultyLevel',
  'patientDescription',
  'clinicalDescription',
  'audioCue',
  'enrichment',
] as const satisfies ReadonlyArray<keyof ExerciseOverrideFields>;

export type MappingOverridesJsonKey = (typeof MAPPING_OVERRIDES_JSON_KEYS)[number];

export type MappingOverridesJson = Pick<ExerciseOverrideFields, MappingOverridesJsonKey>;

export function parseMappingOverridesJson(
  raw: string | MappingOverridesJson | null | undefined
): MappingOverridesJson {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return pickMappingOverrideKeys(raw);
  }
  if (typeof raw !== 'string' || raw.trim().length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return pickMappingOverrideKeys(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}

function pickMappingOverrideKeys(source: Record<string, unknown>): MappingOverridesJson {
  const result: MappingOverridesJson = {};
  for (const key of MAPPING_OVERRIDES_JSON_KEYS) {
    if (!(key in source)) continue;
    const value = source[key];
    if (value === undefined || value === null) continue;
    if (key === 'enrichment') {
      const enrichment = parseEnrichmentOverride(value);
      if (enrichment) result.enrichment = enrichment;
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Build overridesJson string for ExerciseSetMapping from desired vs template baseline.
 * Returns null when empty (clear mapping overrides).
 * Pass `enrichmentDelta` when enrichment personalization is present.
 */
export function buildMappingOverridesJson(
  templateBaseline: InheritedBaseline,
  desired: PersonalizationPatch,
  enrichmentDelta?: EnrichmentOverride | null
): string | null {
  const fullDelta = buildOverrideDelta(templateBaseline, desired);
  const filtered: MappingOverridesJson = {};
  for (const key of MAPPING_OVERRIDES_JSON_KEYS) {
    if (key === 'enrichment') continue;
    if (key in fullDelta && fullDelta[key] !== undefined) {
      (filtered as Record<string, unknown>)[key] = fullDelta[key];
    }
  }
  if (enrichmentDelta && hasEnrichmentOverrideContent(enrichmentDelta)) {
    filtered.enrichment = enrichmentDelta;
  }
  return Object.keys(filtered).length > 0 ? JSON.stringify(filtered) : null;
}

/** Merge mapping overrides under assignment override for resolver precedence. */
export function mergeOverrideLayers(
  mappingOverrides?: MappingOverridesJson | null,
  assignmentOverride?: ExerciseOverrideFields | null
): ExerciseOverrideFields | undefined {
  if (!mappingOverrides && !assignmentOverride) return undefined;
  const enrichment = mergeEnrichmentOverrides(
    mappingOverrides?.enrichment,
    assignmentOverride?.enrichment
  );
  const { enrichment: _mappingEnrichment, ...mappingScalars } = mappingOverrides ?? {};
  const { enrichment: _assignmentEnrichment, ...assignmentScalars } = assignmentOverride ?? {};
  return {
    ...mappingScalars,
    ...assignmentScalars,
    ...(enrichment ? { enrichment } : {}),
  };
}
