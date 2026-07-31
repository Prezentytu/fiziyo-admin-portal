/**
 * Path-whitelisted enrichment overrides for mapping/assignment (SPEC-024).
 * Delta stores only changed personalizable leaves; lists are replaced wholesale.
 */

import type { ExerciseEnrichmentData, EnrichmentPatientMistakeV3 } from '@/graphql/types/exerciseEnrichment.types';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import {
  PERSONALIZABLE_ENRICHMENT_PATHS,
  type PersonalizableEnrichmentPath,
} from './contentContract';

/** Nested override shape — only personalizable patient/safety leaves. */
export interface EnrichmentOverride {
  patient?: {
    summary?: string;
    steps?: string[];
    cues?: string[];
    mistakes?: EnrichmentPatientMistakeV3[];
    should_feel?: string;
    should_not_feel?: string;
    why?: string;
    when_to_do?: string;
  };
  safety?: {
    stop_if?: string;
    intensity_guide?: string;
    requires_supervision?: boolean;
  };
}

function getAtPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== 'object') return undefined;
  const keys = path.split('.');
  let current: unknown = source;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = target;
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    const nested = current[key];
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}

function normalizeForCompare(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    return value;
  }
  return value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeForCompare(left)) === JSON.stringify(normalizeForCompare(right));
}

function isAllowedLeafValue(path: PersonalizableEnrichmentPath, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (path === 'safety.requires_supervision') return typeof value === 'boolean';
  if (path === 'patient.steps' || path === 'patient.cues') {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
  }
  if (path === 'patient.mistakes') {
    return (
      Array.isArray(value) &&
      value.every(
        (item) =>
          item !== null &&
          typeof item === 'object' &&
          !Array.isArray(item) &&
          (typeof (item as EnrichmentPatientMistakeV3).mistake === 'string' ||
            typeof (item as EnrichmentPatientMistakeV3).fix === 'string' ||
            (item as EnrichmentPatientMistakeV3).mistake === undefined)
      )
    );
  }
  return typeof value === 'string';
}

/**
 * Pick only whitelisted paths from an unknown object into EnrichmentOverride.
 */
export function parseEnrichmentOverride(raw: unknown): EnrichmentOverride | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const result: EnrichmentOverride = {};
  let hasAny = false;
  for (const path of PERSONALIZABLE_ENRICHMENT_PATHS) {
    const value = getAtPath(raw, path);
    if (!isAllowedLeafValue(path, value)) continue;
    setAtPath(result as Record<string, unknown>, path, value);
    hasAny = true;
  }
  return hasAny ? result : undefined;
}

export function hasEnrichmentOverrideContent(override?: EnrichmentOverride | null): boolean {
  if (!override) return false;
  for (const path of PERSONALIZABLE_ENRICHMENT_PATHS) {
    const value = getAtPath(override, path);
    if (normalizeForCompare(value) !== undefined) return true;
  }
  return false;
}

/**
 * Build delta of personalizable paths that differ from template baseline.
 * Lists are compared/replaced wholesale. Returns undefined when empty.
 */
export function buildEnrichmentOverrideDelta(
  template: ExerciseEnrichmentData | null | undefined,
  desired: ExerciseEnrichmentData | null | undefined
): EnrichmentOverride | undefined {
  const baseline = toV3(template);
  const next = toV3(desired);
  const delta: EnrichmentOverride = {};
  let hasAny = false;

  for (const path of PERSONALIZABLE_ENRICHMENT_PATHS) {
    const baselineValue = getAtPath(baseline, path);
    const desiredValue = getAtPath(next, path);
    if (valuesEqual(baselineValue, desiredValue)) continue;
    // Explicit clear: empty string / empty array / false still counts as override when baseline had value
    const normalizedDesired = normalizeForCompare(desiredValue);
    if (normalizedDesired === undefined) {
      if (normalizeForCompare(baselineValue) === undefined) continue;
      // Store empty sentinel for clear: empty string / [] / false
      if (path === 'safety.requires_supervision') {
        setAtPath(delta as Record<string, unknown>, path, false);
      } else if (path === 'patient.steps' || path === 'patient.cues' || path === 'patient.mistakes') {
        setAtPath(delta as Record<string, unknown>, path, []);
      } else {
        setAtPath(delta as Record<string, unknown>, path, '');
      }
    } else {
      setAtPath(delta as Record<string, unknown>, path, desiredValue);
    }
    hasAny = true;
  }

  return hasAny ? delta : undefined;
}

/**
 * Apply path-level enrichment override onto a template (v3).
 * Only personalizable paths from override are written; therapist/ai/equipment stay from template.
 */
export function applyEnrichmentOverride(
  template: ExerciseEnrichmentData | null | undefined,
  override?: EnrichmentOverride | null
): ExerciseEnrichmentData {
  const result = toV3(template);
  if (!override || !hasEnrichmentOverrideContent(override)) return result;

  for (const path of PERSONALIZABLE_ENRICHMENT_PATHS) {
    const value = getAtPath(override, path);
    if (value === undefined) continue;
    setAtPath(result as Record<string, unknown>, path, value);
  }
  return result;
}

/**
 * Merge two enrichment overrides path-by-path (later wins on conflict).
 */
export function mergeEnrichmentOverrides(
  base?: EnrichmentOverride | null,
  overlay?: EnrichmentOverride | null
): EnrichmentOverride | undefined {
  if (!base && !overlay) return undefined;
  if (!base) return overlay ?? undefined;
  if (!overlay) return base;
  const merged: EnrichmentOverride = {};
  for (const path of PERSONALIZABLE_ENRICHMENT_PATHS) {
    const overlayValue = getAtPath(overlay, path);
    const baseValue = getAtPath(base, path);
    const value = overlayValue !== undefined ? overlayValue : baseValue;
    if (value === undefined) continue;
    setAtPath(merged as Record<string, unknown>, path, value);
  }
  return hasEnrichmentOverrideContent(merged) ? merged : undefined;
}

export function listOverriddenEnrichmentPaths(override?: EnrichmentOverride | null): PersonalizableEnrichmentPath[] {
  if (!override) return [];
  return PERSONALIZABLE_ENRICHMENT_PATHS.filter((path) => getAtPath(override, path) !== undefined);
}
