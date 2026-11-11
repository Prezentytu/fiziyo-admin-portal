import type { EnrichmentContraindicationV33, ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import { cleanupEnrichment, compactEnrichment } from './enrichment';
import { ENRICHMENT_SCHEMA_V3 } from './enrichmentToV3';

/**
 * Document paths the verification center may write on a v3.3 record. Every other key of the
 * loaded document is saved back untouched.
 */
export const V33_EDITABLE_PATHS = [
  'patient.summary',
  'patient.steps',
  'patient.step_images',
  'patient.cues',
  'patient.cue_phases',
  'patient.mistakes',
  'patient.should_feel',
  'patient.should_not_feel',
  'patient.why',
  'patient.when_to_do',
  'safety.stop_if',
  'safety.requires_supervision',
  'safety.contraindications',
  'ai.keywords',
] as const;

/** `updateExercise` variables that write columns retired by contract v3.3 (§2). */
const RETIRED_CORE_VARIABLES_V33 = ['description', 'clinicalDescription'] as const;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function getAtPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), source);
}

function setAtPath(target: UnknownRecord, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = target;
  for (const key of keys.slice(0, -1)) {
    if (!isRecord(current[key])) current[key] = {};
    current = current[key] as UnknownRecord;
  }
  current[keys[keys.length - 1]] = value;
}

function deleteAtPath(target: UnknownRecord, path: string): void {
  const keys = path.split('.');
  const parent = getAtPath(target, keys.slice(0, -1).join('.'));
  if (isRecord(parent)) delete parent[keys[keys.length - 1]];
}

/**
 * Save payload for a v3.3 record: a deep copy of the loaded document with only the edited paths
 * replaced. A path counts as edited when its cleaned draft value differs from the cleaned loaded
 * value, so untouched text keeps its exact bytes and `schemaVersion`, `$schema` and unknown keys survive.
 * An emptied field drops its key.
 */
export function applyVerificationEditsV33(
  loaded: ExerciseEnrichmentData | null | undefined,
  draft: ExerciseEnrichmentData
): ExerciseEnrichmentData {
  const result = structuredClone(loaded ?? {}) as UnknownRecord;
  const cleanedDraft = compactEnrichment(draft) ?? {};

  for (const path of V33_EDITABLE_PATHS) {
    const next = getAtPath(cleanedDraft, path);
    const current = cleanupEnrichment(getAtPath(loaded, path));
    if (JSON.stringify(next) === JSON.stringify(current)) continue;
    if (next === undefined) deleteAtPath(result, path);
    else setAtPath(result, path, next);
  }

  return result as ExerciseEnrichmentData;
}

/** Drops retired description columns from `updateExercise` variables of a v3.3 record. */
export function omitRetiredCoreVariablesV33(variables: Record<string, unknown>): Record<string, unknown> {
  const retired: readonly string[] = RETIRED_CORE_VARIABLES_V33;
  return Object.fromEntries(Object.entries(variables).filter(([key]) => !retired.includes(key)));
}

/**
 * The editor form keeps a document whole only when it carries the v3 marker; without it the form
 * would rebuild five sections and lose v3.3 keys from its draft.
 */
export function withV3SchemaMarker(document: ExerciseEnrichmentData | null | undefined): ExerciseEnrichmentData {
  return { ...(document ?? {}), $schema: ENRICHMENT_SCHEMA_V3 };
}

export function readContraindicationTextsV33(enrichment: ExerciseEnrichmentData): string[] {
  const items: unknown = getAtPath(enrichment, 'safety.contraindications');
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (isRecord(item) ? item.text : item))
    .filter((text): text is string => typeof text === 'string' && text.trim().length > 0);
}

/** Contraindications in their v3.3 shape; an entry whose text stays keeps its other keys. */
export function writeContraindicationsV33(
  enrichment: ExerciseEnrichmentData,
  texts: string[]
): EnrichmentContraindicationV33[] {
  const existing: unknown = getAtPath(enrichment, 'safety.contraindications');
  const byText = new Map<string, EnrichmentContraindicationV33>();
  for (const item of Array.isArray(existing) ? existing : []) {
    if (isRecord(item) && typeof item.text === 'string') byText.set(item.text, item as EnrichmentContraindicationV33);
  }
  return texts.map((text) => byText.get(text) ?? { text });
}
