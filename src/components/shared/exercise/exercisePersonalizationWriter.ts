/**
 * SSOT write-path for patient personalization (SPEC-021).
 * Routes each field to mapping mutation variables or assignment override JSON
 * based on fieldContract.persistence.
 */

import type { ExerciseFieldKey } from './displayRegistry';
import {
  EXERCISE_FIELD_EDIT_CONFIG,
  MAPPING_ONLY_FIELD_CONFIG,
  type MappingOnlyFieldKey,
} from './fieldContract';
import type { ExerciseOverrideFields } from './exerciseOverride';
import { mergeEnrichmentOverrides } from './enrichmentOverride';

/** Patch keys accepted from UI cards / builders (fieldContract + mapping-only + JSON aliases). */
export interface PersonalizationPatch {
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  executionTime?: number | null;
  restSets?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  tempo?: string | null;
  loadKg?: number | null;
  loadWeightKg?: number | null;
  notes?: string | null;
  customName?: string | null;
  customDescription?: string | null;
  side?: string | null;
  exerciseSide?: string | null;
  rangeOfMotion?: string | null;
  difficultyLevel?: string | null;
  patientDescription?: string | null;
  clinicalDescription?: string | null;
  audioCue?: string | null;
  customImages?: string[] | null;
  hidden?: boolean | null;
}

export interface MappingMutationVariables {
  sets?: number;
  reps?: number;
  duration?: number;
  executionTime?: number;
  restSets?: number;
  restReps?: number;
  preparationTime?: number;
  tempo?: string;
  loadWeightKg?: number;
  notes?: string;
  customName?: string;
  customDescription?: string;
}

export interface SplitPersonalizationResult {
  mappingVariables: MappingMutationVariables;
  overrideDelta: ExerciseOverrideFields;
}

export type OverrideMap = Record<string, ExerciseOverrideFields>;

/** Inherited baseline used when computing a delta (mapping ∪ template). */
export type InheritedBaseline = Partial<{
  sets: number;
  reps: number;
  duration: number;
  executionTime: number;
  restSets: number;
  restReps: number;
  preparationTime: number;
  tempo: string;
  loadWeightKg: number;
  loadKg: number;
  notes: string;
  customName: string;
  customDescription: string;
  side: string;
  exerciseSide: string;
  rangeOfMotion: string;
  difficultyLevel: string;
  patientDescription: string;
  clinicalDescription: string;
  audioCue: string;
  customImages: string[];
  hidden: boolean;
}>;

type ContractOrMappingKey = ExerciseFieldKey | MappingOnlyFieldKey;

function getPersistence(key: ContractOrMappingKey): 'mapping' | 'assignmentOverride' | 'templateOnly' {
  if (key === 'customName' || key === 'customDescription') {
    return MAPPING_ONLY_FIELD_CONFIG[key].persistence;
  }
  return EXERCISE_FIELD_EDIT_CONFIG[key].persistence;
}

function normalizeSide(value: string | null | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = value.toString().trim().toLowerCase();
  return normalized.length > 0 ? normalized : 'none';
}

function normalizeDifficulty(value: string | null | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  const normalized = value.toString().trim().toUpperCase();
  return normalized.length > 0 ? normalized : 'UNKNOWN';
}

function normalizeText(value: string | null | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value;
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }
  if (typeof left === 'number' || typeof right === 'number') {
    const leftNumber = left == null || left === '' ? null : Number(left);
    const rightNumber = right == null || right === '' ? null : Number(right);
    if (Number.isNaN(leftNumber) && Number.isNaN(rightNumber)) return true;
    return leftNumber === rightNumber;
  }
  const leftText = left == null ? '' : String(left);
  const rightText = right == null ? '' : String(right);
  return leftText === rightText;
}

/**
 * Split a UI personalization patch into mapping mutation args and override delta.
 * Only defined patch keys are routed; undefined means "not touched".
 */
export function splitPersonalization(patch: PersonalizationPatch): SplitPersonalizationResult {
  const mappingVariables: MappingMutationVariables = {};
  const overrideDelta: ExerciseOverrideFields = {};

  const assignMappingNumber = (
    key: 'sets' | 'reps' | 'duration' | 'executionTime' | 'restSets' | 'restReps' | 'preparationTime' | 'loadWeightKg',
    value: number | null | undefined
  ) => {
    if (value === undefined || value === null) return;
    mappingVariables[key] = value;
  };

  const assignMappingString = (
    key: 'tempo' | 'notes' | 'customName' | 'customDescription',
    value: string | null | undefined
  ) => {
    if (value === undefined) return;
    mappingVariables[key] = value ?? '';
  };

  if ('sets' in patch && getPersistence('sets') === 'mapping') {
    assignMappingNumber('sets', patch.sets);
  }
  if ('reps' in patch && getPersistence('reps') === 'mapping') {
    assignMappingNumber('reps', patch.reps);
  }
  if ('duration' in patch && getPersistence('duration') === 'mapping') {
    assignMappingNumber('duration', patch.duration);
  }
  if ('executionTime' in patch && getPersistence('executionTime') === 'mapping') {
    assignMappingNumber('executionTime', patch.executionTime);
  }
  if ('restSets' in patch && getPersistence('restSets') === 'mapping') {
    assignMappingNumber('restSets', patch.restSets);
  }
  if ('restReps' in patch && getPersistence('restReps') === 'mapping') {
    assignMappingNumber('restReps', patch.restReps);
  }
  if ('preparationTime' in patch && getPersistence('preparationTime') === 'mapping') {
    assignMappingNumber('preparationTime', patch.preparationTime);
  }
  if ('tempo' in patch && getPersistence('tempo') === 'mapping') {
    assignMappingString('tempo', patch.tempo);
  }
  if (('loadKg' in patch || 'loadWeightKg' in patch) && getPersistence('load') === 'mapping') {
    const loadValue = patch.loadWeightKg ?? patch.loadKg;
    assignMappingNumber('loadWeightKg', loadValue);
  }
  if ('notes' in patch && getPersistence('notes') === 'mapping') {
    assignMappingString('notes', patch.notes);
  }
  if ('customName' in patch && getPersistence('customName') === 'mapping') {
    assignMappingString('customName', patch.customName);
  }
  if ('customDescription' in patch && getPersistence('customDescription') === 'mapping') {
    assignMappingString('customDescription', patch.customDescription);
  }

  if (('side' in patch || 'exerciseSide' in patch) && getPersistence('side') === 'assignmentOverride') {
    const sideValue = normalizeSide(patch.exerciseSide ?? patch.side);
    if (sideValue !== undefined) {
      overrideDelta.exerciseSide = sideValue;
    }
  }
  if ('rangeOfMotion' in patch && getPersistence('rangeOfMotion') === 'assignmentOverride') {
    const rom = normalizeText(patch.rangeOfMotion);
    if (rom !== undefined) {
      overrideDelta.rangeOfMotion = rom;
    }
  }
  if ('difficultyLevel' in patch && getPersistence('difficultyLevel') === 'assignmentOverride') {
    const difficulty = normalizeDifficulty(patch.difficultyLevel);
    if (difficulty !== undefined) {
      overrideDelta.difficultyLevel = difficulty;
    }
  }
  if ('patientDescription' in patch && getPersistence('patientDescription') === 'assignmentOverride') {
    const description = normalizeText(patch.patientDescription);
    if (description !== undefined) {
      overrideDelta.patientDescription = description;
    }
  }
  if ('clinicalDescription' in patch && getPersistence('clinicalDescription') === 'assignmentOverride') {
    const description = normalizeText(patch.clinicalDescription);
    if (description !== undefined) {
      overrideDelta.clinicalDescription = description;
    }
  }
  if ('audioCue' in patch && getPersistence('audioCue') === 'assignmentOverride') {
    const cue = normalizeText(patch.audioCue);
    if (cue !== undefined) {
      overrideDelta.audioCue = cue;
    }
  }
  if ('customImages' in patch && patch.customImages !== undefined) {
    overrideDelta.customImages = patch.customImages ?? [];
  }
  if ('hidden' in patch && patch.hidden !== undefined && patch.hidden !== null) {
    overrideDelta.hidden = patch.hidden;
  }

  return { mappingVariables, overrideDelta };
}

/**
 * Build override JSON delta: only keys that differ from inherited baseline.
 * Explicit clear uses neutral sentinels ('' / 'none' / 'UNKNOWN'), never null.
 */
export function buildOverrideDelta(
  inherited: InheritedBaseline,
  desired: PersonalizationPatch
): ExerciseOverrideFields {
  const delta: ExerciseOverrideFields = {};

  const inheritedSide = normalizeSide(inherited.exerciseSide ?? inherited.side) ?? 'none';
  const desiredSide = 'side' in desired || 'exerciseSide' in desired
    ? normalizeSide(desired.exerciseSide ?? desired.side) ?? 'none'
    : undefined;
  if (desiredSide !== undefined && desiredSide !== inheritedSide) {
    delta.exerciseSide = desiredSide;
  }

  const inheritedRom = inherited.rangeOfMotion ?? '';
  if ('rangeOfMotion' in desired) {
    const desiredRom = normalizeText(desired.rangeOfMotion) ?? '';
    if (!valuesEqual(desiredRom, inheritedRom)) {
      delta.rangeOfMotion = desiredRom;
    }
  }

  const inheritedDifficulty = normalizeDifficulty(inherited.difficultyLevel) ?? 'UNKNOWN';
  if ('difficultyLevel' in desired) {
    const desiredDifficulty = normalizeDifficulty(desired.difficultyLevel) ?? 'UNKNOWN';
    if (desiredDifficulty !== inheritedDifficulty) {
      delta.difficultyLevel = desiredDifficulty;
    }
  }

  const compareText = (
    key: 'patientDescription' | 'clinicalDescription' | 'audioCue' | 'notes' | 'customName' | 'customDescription' | 'tempo',
    overrideKey: keyof ExerciseOverrideFields = key
  ) => {
    if (!(key in desired)) return;
    const inheritedValue = inherited[key] ?? '';
    const desiredValue = normalizeText(desired[key] as string | null | undefined) ?? '';
    if (!valuesEqual(desiredValue, inheritedValue)) {
      (delta as Record<string, unknown>)[overrideKey] = desiredValue;
    }
  };

  compareText('patientDescription');
  compareText('clinicalDescription');
  compareText('audioCue');

  // Dosage fields may also land in override (post-assign Edit dialog).
  const compareNumber = (
    key: 'sets' | 'reps' | 'duration' | 'executionTime' | 'restSets' | 'restReps' | 'preparationTime',
    overrideKey: keyof ExerciseOverrideFields = key
  ) => {
    if (!(key in desired)) return;
    const inheritedValue = inherited[key];
    const desiredValue = desired[key];
    if (desiredValue === undefined) return;
    if (!valuesEqual(desiredValue, inheritedValue ?? null)) {
      if (desiredValue === null) return;
      (delta as Record<string, unknown>)[overrideKey] = desiredValue;
    }
  };

  compareNumber('sets');
  compareNumber('reps');
  compareNumber('duration');
  compareNumber('executionTime');
  compareNumber('restSets');
  compareNumber('restReps');
  compareNumber('preparationTime');
  compareText('tempo');
  compareText('notes');
  compareText('customName');
  compareText('customDescription');

  if ('loadKg' in desired || 'loadWeightKg' in desired) {
    const inheritedLoad = inherited.loadWeightKg ?? inherited.loadKg ?? null;
    const desiredLoad = desired.loadWeightKg ?? desired.loadKg ?? null;
    if (!valuesEqual(desiredLoad, inheritedLoad) && desiredLoad !== null && desiredLoad !== undefined) {
      delta.loadWeightKg = desiredLoad;
    }
  }

  if ('customImages' in desired && desired.customImages !== undefined) {
    const inheritedImages = inherited.customImages ?? [];
    const desiredImages = desired.customImages ?? [];
    if (!valuesEqual(desiredImages, inheritedImages)) {
      delta.customImages = desiredImages;
    }
  }

  if ('hidden' in desired && desired.hidden !== undefined && desired.hidden !== null) {
    const inheritedHidden = inherited.hidden ?? false;
    if (desired.hidden !== inheritedHidden) {
      delta.hidden = desired.hidden;
    }
  }

  return delta;
}

export function parseOverrideMap(raw: string | null | undefined): OverrideMap {
  if (!raw || raw.trim().length === 0) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as OverrideMap;
  } catch {
    return {};
  }
}

export function stringifyOverrideMap(map: OverrideMap): string {
  return JSON.stringify(map);
}

/**
 * Merge a partial delta into an existing mapping entry (keeps untouched keys).
 * Empty delta removes the mapping key.
 */
export function mergeOverrideMap(
  existingJson: string | null | undefined,
  mappingId: string,
  delta: ExerciseOverrideFields
): string {
  const map = parseOverrideMap(existingJson);
  const hasKeys = Object.keys(delta).length > 0;
  if (!hasKeys) {
    delete map[mappingId];
    return stringifyOverrideMap(map);
  }

  const previous = map[mappingId] ?? {};
  const enrichment = mergeEnrichmentOverrides(previous.enrichment, delta.enrichment);
  const { enrichment: _prevEnrichment, ...previousScalars } = previous;
  const { enrichment: _deltaEnrichment, ...deltaScalars } = delta;
  map[mappingId] = {
    ...previousScalars,
    ...deltaScalars,
    ...(enrichment ? { enrichment } : {}),
  };
  return stringifyOverrideMap(map);
}

/**
 * Replace the entire override entry for a mapping (dialog save / full rebuild).
 * Empty entry removes the mapping key. Use this when the delta is a complete
 * "diff vs inherited" snapshot — not a partial patch.
 */
export function replaceOverrideMapEntry(
  existingJson: string | null | undefined,
  mappingId: string,
  entry: ExerciseOverrideFields
): string {
  const map = parseOverrideMap(existingJson);
  if (Object.keys(entry).length === 0) {
    delete map[mappingId];
  } else {
    map[mappingId] = entry;
  }
  return stringifyOverrideMap(map);
}
