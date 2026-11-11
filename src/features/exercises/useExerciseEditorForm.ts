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
import { shouldRehydrateExerciseEditorDraft } from './utils/shouldRehydrateExerciseEditorDraft';
import { normalizeExerciseType } from '@/utils/exerciseEnums';
import type { ExerciseParametersTimingType } from '@/components/shared/exercise/ExerciseParametersFields';
import { describeSavedNonKgLoad, readSavedLoadKg } from './utils/describeSavedLoad';
import { readExerciseContent, type ExerciseContentVersion } from '@/components/shared/exercise/readExerciseContent';
import { buildV33Document, collectV33Edits, loadV33Document } from './utils/enrichmentV33Document';

/**
 * Pojedynczy model formularza edytora ćwiczenia (v3).
 *
 * Trzyma jeden draft dla pól core (Exercise) oraz jeden draft danych v3
 * (znormalizowanych `toV3` raz przy wczytaniu). Zamiast rozproszonego
 * autosave-on-blur udostępnia dirty tracking i jeden skoordynowany zapis
 * (core przez UpdateExercise, v3 przez UpdateExerciseField(enrichmentData)).
 *
 * Rekord w kontrakcie v3.3 (SPEC-037) ma osobną regułę zapisu: dokument powstaje z wczytanego
 * (`buildV33Document`), a wycofane kolumny (opis dla pacjenta, opis kliniczny, notatka, polecenie audio)
 * nigdy nie idą do mutacji.
 */

export interface ExerciseCoreDraft {
  name: string;
  patientDescription: string;
  clinicalDescription: string;
  notes: string;
  audioCue: string;
  tempo: string;
  rangeOfMotion: string;
  /** Opór (np. guma „Średni”); '' = brak. */
  resistance: string;
  /** Sprzęt (np. „Guma, krzesło”); '' = brak. */
  equipment: string;
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
  id?: string | null;
  name?: string | null;
  /** Zapisany typ (REPS/TIME); steruje liczeniem czasu w edytorze parametrów. */
  type?: string | null;
  patientDescription?: string | null;
  description?: string | null;
  clinicalDescription?: string | null;
  notes?: string | null;
  audioCue?: string | null;
  tempo?: string | null;
  rangeOfMotion?: string | null;
  resistance?: string | null;
  equipment?: string | null;
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
  /** Przyszła kolumna wersji treści; wygrywa z `enrichmentData.schemaVersion`. */
  schemaVersion?: string | number | null;
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

function deriveCoreDraft(source: ExerciseEditorSource | null | undefined): ExerciseCoreDraft {
  return {
    name: source?.name ?? '',
    patientDescription: source?.patientDescription ?? source?.description ?? '',
    clinicalDescription: source?.clinicalDescription ?? '',
    notes: source?.notes ?? '',
    audioCue: source?.audioCue ?? '',
    tempo: source?.tempo ?? '',
    rangeOfMotion: source?.rangeOfMotion ?? '',
    resistance: source?.resistance ?? '',
    equipment: source?.equipment ?? '',
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
    loadKg: source ? readSavedLoadKg(source) : null,
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
  current: ExerciseCoreDraft,
  contentVersion: ExerciseContentVersion = 'legacy'
): Record<string, unknown> {
  const variables: Record<string, unknown> = {};
  // A 3.3 record keeps whatever these columns hold: neither a new value nor an erasing null is sent.
  const writesRetiredColumns = contentVersion !== '3.3';

  if (current.name !== initial.name) variables.name = current.name.trim();
  if (writesRetiredColumns) {
    if (current.patientDescription !== initial.patientDescription)
      variables.description = asText(current.patientDescription);
    if (current.clinicalDescription !== initial.clinicalDescription)
      variables.clinicalDescription = asText(current.clinicalDescription);
    if (current.notes !== initial.notes) variables.notes = asText(current.notes);
    if (current.audioCue !== initial.audioCue) variables.audioCue = asText(current.audioCue);
  }
  if (current.tempo !== initial.tempo) variables.tempo = asText(current.tempo);
  if (current.rangeOfMotion !== initial.rangeOfMotion) variables.rangeOfMotion = asText(current.rangeOfMotion);
  // '' (nie null): backend czyści opór/sprzęt tylko pustym tekstem; null = bez zmian.
  if (current.resistance !== initial.resistance) variables.resistance = current.resistance.trim();
  if (current.equipment !== initial.equipment) variables.equipment = current.equipment.trim();
  if (current.videoUrl !== initial.videoUrl) variables.videoUrl = asText(current.videoUrl);
  // UpdateExercise skips null/omitted exerciseSide. "none" must be sent as the
  // enum name so Razem (None) can replace Both/Left/Right instead of no-oping.
  if (current.side !== initial.side) variables.exerciseSide = current.side;
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
  const derivedVersion = useMemo(() => readExerciseContent(source).version, [source]);
  // A 3.3 document is edited as loaded: `toV3` would rebuild one without `$schema` from five sections only.
  const derivedEnrichment = useMemo(
    () => (derivedVersion === '3.3' ? loadV33Document(source?.enrichmentData) : toV3(source?.enrichmentData)),
    [derivedVersion, source?.enrichmentData]
  );

  // Baseline (dirty-tracking) state. Hydration runs once per exercise identity.
  // Refetch (np. po uploadzie zdjęcia AI) nie nadpisuje brudnego draftu.
  const [initialCore, setInitialCore] = useState<ExerciseCoreDraft>(derivedCore);
  const [initialEnrichment, setInitialEnrichment] = useState<ExerciseEnrichmentData>(derivedEnrichment);
  const [core, setCore] = useState<ExerciseCoreDraft>(derivedCore);
  const [enrichment, setEnrichment] = useState<ExerciseEnrichmentData>(derivedEnrichment);
  // Fixed at hydration together with the baseline, so the write rule always matches the loaded document.
  const [contentVersion, setContentVersion] = useState<ExerciseContentVersion>(derivedVersion);
  const [saveStatus, setSaveStatus] = useState<ExerciseSaveStatus>('idle');

  const hasHydratedRef = useRef(false);
  const hydratedIdentityRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);

  const coreDirty = useMemo(
    () => Object.keys(buildChangedCoreVariables(initialCore, core, contentVersion)).length > 0,
    [initialCore, core, contentVersion]
  );

  const initialEnrichmentPayload = useMemo(
    () => JSON.stringify(composeEnrichmentPayload(initialEnrichment)),
    [initialEnrichment]
  );

  const enrichmentDirty = useMemo(
    () =>
      contentVersion === '3.3'
        ? Object.keys(collectV33Edits(initialEnrichment, enrichment)).length > 0
        : JSON.stringify(composeEnrichmentPayload(enrichment)) !== initialEnrichmentPayload,
    [contentVersion, enrichment, initialEnrichment, initialEnrichmentPayload]
  );

  const isDirty = coreDirty || enrichmentDirty;
  isDirtyRef.current = isDirty;

  useEffect(() => {
    const sourceIdentity = source?.id ?? null;
    if (
      !shouldRehydrateExerciseEditorDraft({
        hasSource: Boolean(source),
        hasHydrated: hasHydratedRef.current,
        isDirty: isDirtyRef.current,
        isAutosave,
        sourceIdentity,
        hydratedIdentity: hydratedIdentityRef.current,
      })
    ) {
      return;
    }
    hasHydratedRef.current = true;
    hydratedIdentityRef.current = sourceIdentity;
    setInitialCore(derivedCore);
    setInitialEnrichment(derivedEnrichment);
    setCore(derivedCore);
    setEnrichment(derivedEnrichment);
    setContentVersion(derivedVersion);
    setSaveStatus('idle');
  }, [derivedCore, derivedEnrichment, derivedVersion, isAutosave, source]);

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
  const initialEnrichmentRef = useRef(initialEnrichment);
  coreRef.current = core;
  enrichmentRef.current = enrichment;
  initialCoreRef.current = initialCore;
  initialEnrichmentRef.current = initialEnrichment;

  /** Snapshotuje aktualny draft jako nową baseline bez refetchu — używane po autosave. */
  const markSaved = useCallback(() => {
    setInitialCore(coreRef.current);
    setInitialEnrichment(enrichmentRef.current);
  }, []);

  const performSave = useCallback(async () => {
    const currentCore = coreRef.current;
    const currentEnrichment = enrichmentRef.current;
    const isV33 = contentVersion === '3.3';
    const coreVariables = buildChangedCoreVariables(initialCoreRef.current, currentCore, contentVersion);
    const currentCoreDirty = Object.keys(coreVariables).length > 0;
    const v33Edits = isV33 ? collectV33Edits(initialEnrichmentRef.current, currentEnrichment) : {};
    const currentEnrichmentPayload = isV33
      ? buildV33Document(initialEnrichmentRef.current, v33Edits)
      : composeEnrichmentPayload(currentEnrichment);
    const currentEnrichmentDirty = isV33
      ? Object.keys(v33Edits).length > 0
      : JSON.stringify(currentEnrichmentPayload) !== initialEnrichmentPayload;

    if (!currentCoreDirty && !currentEnrichmentDirty) return;

    setSaveStatus('saving');
    try {
      if (currentCoreDirty) {
        await updateCore(coreVariables);
      }
      if (currentEnrichmentDirty) {
        await updateEnrichment(currentEnrichmentPayload);
      }
      setSaveStatus('success');
      if (isV33) {
        // The baseline is the document that was sent, so the next save starts from what the backend holds.
        setInitialCore(currentCore);
        if (currentEnrichmentDirty) setInitialEnrichment(currentEnrichmentPayload);
      } else {
        markSaved();
      }
      onSaved?.();
    } catch (error) {
      console.error('[ExerciseEditor] Save failed:', error);
      setSaveStatus('error');
      onError?.(error);
    }
  }, [contentVersion, initialEnrichmentPayload, markSaved, onError, onSaved, updateCore, updateEnrichment]);

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

  const exerciseType: ExerciseParametersTimingType = normalizeExerciseType(source?.type) ?? 'draft';
  const savedLoadLabel = useMemo(() => describeSavedNonKgLoad(source), [source]);

  return useMemo(
    () => ({
      core,
      exerciseType,
      savedLoadLabel,
      enrichment,
      contentVersion,
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
      contentVersion,
      core,
      exerciseType,
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
      savedLoadLabel,
      setCoreField,
      setEnrichmentPath,
    ]
  );
}

export type UseExerciseEditorFormResult = ReturnType<typeof useExerciseEditorForm>;
