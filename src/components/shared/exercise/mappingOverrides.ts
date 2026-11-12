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
  'resistance',
  'equipment',
  'difficultyLevel',
  'patientDescription',
  'clinicalDescription',
  'audioCue',
  'enrichment',
] as const satisfies ReadonlyArray<keyof ExerciseOverrideFields>;

export type MappingOverridesJsonKey = (typeof MAPPING_OVERRIDES_JSON_KEYS)[number];

/**
 * Pola tekstowe pozycji, które fizjoterapeuta może świadomie wyczyścić (FR-007, decyzja A).
 * W `overridesJson` pozycji: brak klucza = dziedziczy z ćwiczenia, `null` = wyczyszczone, napis = nadpisanie.
 * Opór i sprzęt mają własną regułę (`''` czyści, `null` dziedziczy), strona czyści się jako `'none'`.
 */
export const MAPPING_CLEARABLE_TEXT_KEYS = [
  'rangeOfMotion',
  'difficultyLevel',
  'patientDescription',
  'clinicalDescription',
  'audioCue',
] as const satisfies ReadonlyArray<MappingOverridesJsonKey>;

export type MappingClearableTextKey = (typeof MAPPING_CLEARABLE_TEXT_KEYS)[number];

export type MappingOverridesJson = Omit<
  Pick<ExerciseOverrideFields, MappingOverridesJsonKey>,
  MappingClearableTextKey
> &
  Partial<Record<MappingClearableTextKey, string | null>>;

function isMappingClearableTextKey(key: string): key is MappingClearableTextKey {
  return (MAPPING_CLEARABLE_TEXT_KEYS as readonly string[]).includes(key);
}

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
    if (value === null && isMappingClearableTextKey(key)) {
      result[key] = null;
      continue;
    }
    if (value === undefined || value === null) continue;
    if (key === 'enrichment') {
      const enrichment = parseEnrichmentOverride(value);
      if (enrichment) result.enrichment = enrichment;
      continue;
    }
    if (isMappingPlaceholder(key, value)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Plany z szablonu mają zapisane '' i 'UNKNOWN' w każdej pozycji (zgłoszenie YTn5Dsmm); to brak nadpisania,
 * tak jak w aplikacji. 'none' w stronie zostaje, bo to świadomy wybór „Razem”. resistance/equipment bez zmian.
 */
function isMappingPlaceholder(key: MappingOverridesJsonKey, value: unknown): boolean {
  if (typeof value !== 'string' || key === 'resistance' || key === 'equipment') return false;
  const trimmed = value.trim();
  return trimmed.length === 0 || (key === 'difficultyLevel' && trimmed.toUpperCase() === 'UNKNOWN');
}

/**
 * Build overridesJson string for ExerciseSetMapping from desired vs template baseline.
 * Returns null when empty (clear mapping overrides).
 * Wyczyszczone pola tekstowe (MAPPING_CLEARABLE_TEXT_KEYS) zapisuje jako null, opór i sprzęt jako pusty napis.
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
      const value = fullDelta[key];
      (filtered as Record<string, unknown>)[key] =
        isMappingClearableTextKey(key) && isMappingPlaceholder(key, value) ? null : value;
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
  const { enrichment: _mappingEnrichment, ...mappingFields } = mappingOverrides ?? {};
  const { enrichment: _assignmentEnrichment, ...assignmentScalars } = assignmentOverride ?? {};
  // null (wyczyszczone w pozycji) nie jest wartością warstwy; resolver czyta go z resolveMappingClearedKeys.
  const mappingScalars = Object.fromEntries(
    Object.entries(mappingFields).filter(([, value]) => value !== null)
  ) as ExerciseOverrideFields;
  return {
    ...mappingScalars,
    ...assignmentScalars,
    ...(enrichment ? { enrichment } : {}),
  };
}

/**
 * Pola wyczyszczone w pozycji zestawu (`null` w overridesJson), których nie nadpisuje przypisanie pacjenta.
 * Dla nich efektywna wartość jest pusta, bez rezerwy z katalogu.
 */
export function resolveMappingClearedKeys(
  mappingOverrides?: MappingOverridesJson | null,
  assignmentOverride?: ExerciseOverrideFields | null
): ReadonlySet<MappingClearableTextKey> {
  const cleared = new Set<MappingClearableTextKey>();
  if (!mappingOverrides) return cleared;
  for (const key of MAPPING_CLEARABLE_TEXT_KEYS) {
    if (mappingOverrides[key] === null && assignmentOverride?.[key] === undefined) cleared.add(key);
  }
  return cleared;
}
