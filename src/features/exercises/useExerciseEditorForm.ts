'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { toV3 } from '@/features/verification/utils/enrichmentToV3';
import { buildExerciseLoadMutationVars } from '@/utils/exerciseLoadMutation';
import {
  composeEnrichmentPayload,
  deepCloneEnrichment,
  setEnrichmentAtPath,
} from './useEnrichmentDraft';

/**
 * Pojedynczy model formularza edytora ćwiczenia (v3).
 *
 * Trzyma jeden draft dla pól core (Exercise) oraz jeden draft danych v3
 * (znormalizowanych `toV3` raz przy wczytaniu). Zamiast rozproszonego
 * autosave-on-blur udostępnia dirty tracking i jeden skoordynowany zapis
 * (core przez UpdateExercise, v3 przez UpdateExerciseField(enrichmentData)).
 */

export interface ExerciseCoreDraft {
  name: string;
  patientDescription: string;
  clinicalDescription: string;
  notes: string;
  audioCue: string;
  tempo: string;
  rangeOfMotion: string;
  side: string;
  difficultyLevel: string;
  videoUrl: string;
  sets: number | null;
  reps: number | null;
  executionTime: number | null;
  restSets: number | null;
  restReps: number | null;
  preparationTime: number | null;
  /** Czas serii (tryb czasowy / legacy override) — TIER 4 w fieldContract. */
  duration: number | null;
  /** Obciążenie strukturalne w kg (zastępuje free-text loadText). */
  loadKg: number | null;
  mainTags: string[];
  additionalTags: string[];
}

interface ExerciseLoadLike {
  loadWeightKg?: number | null;
  type?: string | null;
  value?: number | null;
  unit?: string | null;
  text?: string | null;
}

function normalizeTagIds(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag === 'object' && 'id' in tag && typeof (tag as { id: unknown }).id === 'string') {
        return (tag as { id: string }).id;
      }
      return null;
    })
    .filter((tagId): tagId is string => Boolean(tagId));
}

export interface ExerciseEditorSource {
  name?: string | null;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
  notes?: string | null;
  audioCue?: string | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  side?: string | null;
  exerciseSide?: string | null;
  difficultyLevel?: string | null;
  videoUrl?: string | null;
  defaultSets?: number | null;
  sets?: number | null;
  defaultReps?: number | null;
  reps?: number | null;
  defaultExecutionTime?: number | null;
  executionTime?: number | null;
  defaultRestBetweenSets?: number | null;
  restSets?: number | null;
  defaultRestBetweenReps?: number | null;
  restReps?: number | null;
  preparationTime?: number | null;
  defaultDuration?: number | null;
  duration?: number | null;
  defaultLoad?: ExerciseLoadLike | null;
  loadValue?: number | null;
  loadUnit?: string | null;
  mainTags?: unknown;
  additionalTags?: unknown;
  enrichmentData?: ExerciseEnrichmentData | null;
}

export type ExerciseSaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface UseExerciseEditorFormParams {
  source: ExerciseEditorSource | null | undefined;
  updateCore: (variables: Record<string, unknown>) => Promise<void>;
  updateEnrichment: (payload: ExerciseEnrichmentData) => Promise<void>;
  onSaved?: () => void;
  onError?: (error: unknown) => void;
  /**
   * Włącza tryb autosave (debounce po każdej zmianie, bez przycisku "Zapisz").
   * Baseline (dirty-tracking) jest wtedy aktualizowany wyłącznie przez `markSaved()`
   * po udanym zapisie — nie resetuje się przy każdej zmianie referencji `source`
   * (np. po zapisie innego pola w tym samym ćwiczeniu), żeby nie gubić edycji "w locie".
   */
  autosaveDelayMs?: number;
}

function firstNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (value != null && !Number.isNaN(value)) return value;
  }
  return null;
}

function deriveLoadKg(source: ExerciseEditorSource): number | null {
  const load = source.defaultLoad;
  if (load?.loadWeightKg != null && !Number.isNaN(load.loadWeightKg)) {
    return load.loadWeightKg;
  }
  if (load && load.value != null && (load.unit === 'kg' || load.type === 'weight')) {
    return load.value;
  }
  if (source.loadValue != null && source.loadUnit === 'kg') {
    return source.loadValue;
  }
  return null;
}

function deriveCoreDraft(source: ExerciseEditorSource | null | undefined): ExerciseCoreDraft {
  return {
    name: source?.name ?? '',
    patientDescription: source?.patientDescription ?? source?.description ?? '',
    clinicalDescription: source?.clinicalDescription ?? '',
    notes: source?.notes ?? '',
    audioCue: source?.audioCue ?? '',
    tempo: source?.tempo ?? '',
    rangeOfMotion: source?.rangeOfMotion ?? '',
    side: (source?.side ?? source?.exerciseSide ?? 'none').toLowerCase(),
    difficultyLevel: (source?.difficultyLevel ?? 'UNKNOWN').toUpperCase(),
    videoUrl: source?.videoUrl ?? '',
    sets: firstNumber(source?.defaultSets, source?.sets),
    reps: firstNumber(source?.defaultReps, source?.reps),
    executionTime: firstNumber(source?.defaultExecutionTime, source?.executionTime),
    restSets: firstNumber(source?.defaultRestBetweenSets, source?.restSets),
    restReps: firstNumber(source?.defaultRestBetweenReps, source?.restReps),
    preparationTime: firstNumber(source?.preparationTime),
    duration: firstNumber(source?.defaultDuration, source?.duration),
    loadKg: source ? deriveLoadKg(source) : null,
    mainTags: normalizeTagIds(source?.mainTags),
    additionalTags: normalizeTagIds(source?.additionalTags),
  };
}

function getAtPath(source: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = source;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Treats empty string / null / undefined / empty array as the same "no value" for comparison. */
function normalizeForCompare(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value === 'string') return value.trim() === '' ? undefined : value.trim();
  if (Array.isArray(value)) {
    const cleaned = value
      .map((entry) => normalizeForCompare(entry))
      .filter((entry) => entry !== undefined);
    return cleaned.length === 0 ? undefined : cleaned;
  }
  return value;
}

function asText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Exported for unit tests — dirty-diff core draft → UpdateExercise variables. */
export function buildChangedCoreVariables(
  initial: ExerciseCoreDraft,
  current: ExerciseCoreDraft
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  if (current.name !== initial.name) variables.name = current.name.trim();
  if (current.patientDescription !== initial.patientDescription)
    variables.description = asText(current.patientDescription);
  if (current.clinicalDescription !== initial.clinicalDescription)
    variables.clinicalDescription = asText(current.clinicalDescription);
  if (current.notes !== initial.notes) variables.notes = asText(current.notes);
  if (current.audioCue !== initial.audioCue) variables.audioCue = asText(current.audioCue);
  if (current.tempo !== initial.tempo) variables.tempo = asText(current.tempo);
  if (current.rangeOfMotion !== initial.rangeOfMotion) variables.rangeOfMotion = asText(current.rangeOfMotion);
  if (current.videoUrl !== initial.videoUrl) variables.videoUrl = asText(current.videoUrl);
  if (current.side !== initial.side) variables.exerciseSide = current.side === 'none' ? null : current.side;
  if (current.difficultyLevel !== initial.difficultyLevel)
    variables.difficultyLevel = current.difficultyLevel === 'UNKNOWN' ? null : current.difficultyLevel;
  if (current.sets !== initial.sets) variables.sets = current.sets;
  if (current.reps !== initial.reps) variables.reps = current.reps;
  if (current.executionTime !== initial.executionTime) variables.executionTime = current.executionTime;
  if (current.restSets !== initial.restSets) variables.restSets = current.restSets;
  if (current.restReps !== initial.restReps) variables.restReps = current.restReps;
  if (current.preparationTime !== initial.preparationTime) variables.preparationTime = current.preparationTime;
  if (current.duration !== initial.duration) variables.duration = current.duration;

  if (current.loadKg !== initial.loadKg) {
    Object.assign(
      variables,
      buildExerciseLoadMutationVars(
        current.loadKg != null && current.loadKg > 0 ? current.loadKg : null
      )
    );
  }

  if (JSON.stringify(current.mainTags) !== JSON.stringify(initial.mainTags)) {
    variables.mainTags = current.mainTags;
  }
  if (JSON.stringify(current.additionalTags) !== JSON.stringify(initial.additionalTags)) {
    variables.additionalTags = current.additionalTags;
  }

  return variables;
}

export function useExerciseEditorForm({
  source,
  updateCore,
  updateEnrichment,
  onSaved,
  onError,
  autosaveDelayMs,
}: UseExerciseEditorFormParams) {
  const isAutosave = autosaveDelayMs != null;
  const derivedCore = useMemo(() => deriveCoreDraft(source), [source]);
  const derivedEnrichment = useMemo(() => toV3(source?.enrichmentData), [source?.enrichmentData]);

  // Baseline (dirty-tracking) state. W trybie non-autosave zachowuje się jak dawny `useMemo`
  // (zawsze zsynchronizowany ze `źródłem`). W trybie autosave jest inicjalizowany raz przy
  // pierwszym załadowaniu danych i odtąd aktualizowany wyłącznie przez `markSaved()`.
  const [initialCore, setInitialCore] = useState<ExerciseCoreDraft>(derivedCore);
  const [initialEnrichment, setInitialEnrichment] = useState<ExerciseEnrichmentData>(derivedEnrichment);
  const [core, setCore] = useState<ExerciseCoreDraft>(derivedCore);
  const [enrichment, setEnrichment] = useState<ExerciseEnrichmentData>(derivedEnrichment);
  const [saveStatus, setSaveStatus] = useState<ExerciseSaveStatus>('idle');

  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (!source) return;
    if (isAutosave && hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    setInitialCore(derivedCore);
    setInitialEnrichment(derivedEnrichment);
    setCore(derivedCore);
    setEnrichment(derivedEnrichment);
    setSaveStatus('idle');
  }, [derivedCore, derivedEnrichment, isAutosave, source]);

  const initialEnrichmentPayload = useMemo(
    () => JSON.stringify(composeEnrichmentPayload(initialEnrichment)),
    [initialEnrichment]
  );

  const setCoreField = useCallback(<K extends keyof ExerciseCoreDraft>(field: K, value: ExerciseCoreDraft[K]) => {
    setCore((previous) => ({ ...previous, [field]: value }));
    setSaveStatus('idle');
  }, []);

  const setEnrichmentPath = useCallback((path: string, value: unknown) => {
    setEnrichment((previous) => {
      const next = deepCloneEnrichment(previous);
      setEnrichmentAtPath(next as Record<string, unknown>, path, value);
      return next;
    });
    setSaveStatus('idle');
  }, []);

  const replaceEnrichment = useCallback((next: ExerciseEnrichmentData) => {
    setEnrichment(next);
    setSaveStatus('idle');
  }, []);

  const coreDirty = useMemo(
    () => (Object.keys(buildChangedCoreVariables(initialCore, core)).length > 0),
    [initialCore, core]
  );

  const enrichmentPayload = useMemo(() => composeEnrichmentPayload(enrichment), [enrichment]);
  const enrichmentDirty = useMemo(
    () => JSON.stringify(enrichmentPayload) !== initialEnrichmentPayload,
    [enrichmentPayload, initialEnrichmentPayload]
  );

  const isDirty = coreDirty || enrichmentDirty;

  const isCoreFieldDirty = useCallback(
    (field: keyof ExerciseCoreDraft) => {
      const initialValue = initialCore[field];
      const currentValue = core[field];
      if (typeof initialValue === 'string' && typeof currentValue === 'string') {
        return initialValue.trim() !== currentValue.trim();
      }
      return initialValue !== currentValue;
    },
    [initialCore, core]
  );

  const isPathDirty = useCallback(
    (path: string) => {
      const initialValue = normalizeForCompare(getAtPath(initialEnrichment, path));
      const currentValue = normalizeForCompare(getAtPath(enrichment, path));
      return JSON.stringify(initialValue) !== JSON.stringify(currentValue);
    },
    [initialEnrichment, enrichment]
  );

  const reset = useCallback(() => {
    setCore(initialCore);
    setEnrichment(initialEnrichment);
    setSaveStatus('idle');
  }, [initialCore, initialEnrichment]);

  const coreRef = useRef(core);
  const enrichmentRef = useRef(enrichment);
  const initialCoreRef = useRef(initialCore);
  coreRef.current = core;
  enrichmentRef.current = enrichment;
  initialCoreRef.current = initialCore;

  /** Snapshotuje aktualny draft jako nową baseline bez refetchu — używane po autosave. */
  const markSaved = useCallback(() => {
    setInitialCore(coreRef.current);
    setInitialEnrichment(enrichmentRef.current);
  }, []);

  const performSave = useCallback(async () => {
    const currentCore = coreRef.current;
    const currentEnrichment = enrichmentRef.current;
    const currentCoreDirty = Object.keys(buildChangedCoreVariables(initialCoreRef.current, currentCore)).length > 0;
    const currentEnrichmentPayload = composeEnrichmentPayload(currentEnrichment);
    const currentEnrichmentDirty = JSON.stringify(currentEnrichmentPayload) !== initialEnrichmentPayload;

    if (!currentCoreDirty && !currentEnrichmentDirty) return;

    setSaveStatus('saving');
    try {
      if (currentCoreDirty) {
        await updateCore(buildChangedCoreVariables(initialCoreRef.current, currentCore));
      }
      if (currentEnrichmentDirty) {
        await updateEnrichment(currentEnrichmentPayload);
      }
      setSaveStatus('success');
      markSaved();
      onSaved?.();
    } catch (error) {
      console.error('[ExerciseEditor] Save failed:', error);
      setSaveStatus('error');
      onError?.(error);
    }
  }, [initialEnrichmentPayload, markSaved, onError, onSaved, updateCore, updateEnrichment]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  const save = useCallback(async () => {
    await flush();
  }, [flush]);

  useEffect(() => {
    if (!isAutosave) return;
    if (!isDirty) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void performSave();
    }, autosaveDelayMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retrigger only when draft actually changes (core/enrichment), not on every fn identity churn
  }, [autosaveDelayMs, core, enrichment, isAutosave, isDirty]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return useMemo(
    () => ({
      core,
      enrichment,
      setCoreField,
      setEnrichmentPath,
      replaceEnrichment,
      isDirty,
      isCoreFieldDirty,
      isPathDirty,
      saveStatus,
      save,
      flush,
      markSaved,
      reset,
    }),
    [
      core,
      enrichment,
      flush,
      isCoreFieldDirty,
      isDirty,
      isPathDirty,
      markSaved,
      replaceEnrichment,
      reset,
      save,
      saveStatus,
      setCoreField,
      setEnrichmentPath,
    ]
  );
}

export type UseExerciseEditorFormResult = ReturnType<typeof useExerciseEditorForm>;
