'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { compactEnrichment } from '@/features/verification/utils/enrichment';
import { ENRICHMENT_SCHEMA_V3, toV3 } from '@/features/verification/utils/enrichmentToV3';
import { computeCompleteness } from '@/features/verification/utils/enrichmentSkeleton';

export function deepCloneEnrichment<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function setEnrichmentAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
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

export function composeEnrichmentPayload(draft: ExerciseEnrichmentData): ExerciseEnrichmentData {
  return { ...compactEnrichment(draft), $schema: ENRICHMENT_SCHEMA_V3 };
}

type PlainRecord = Record<string, unknown>;

function asPlainRecord(value: unknown): PlainRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? (value as PlainRecord) : null;
}

function isSameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Listy powiązane indeksem: kompaktowanie przesuwa zdjęcia kroków i fazy wskazówek razem z wyciętym pustym wpisem
 * (`realignMediaForBlankEntries`), więc każda z pary wraca z wczytanego dokumentu tylko razem z drugą.
 */
const LINKED_PATHS: Readonly<Record<string, string>> = {
  'patient.steps': 'patient.step_images',
  'patient.step_images': 'patient.steps',
  'patient.cues': 'patient.cue_phases',
  'patient.cue_phases': 'patient.cues',
};

/**
 * Uzupełnia wysyłany dokument (`target`, po kompaktowaniu) o to, czego użytkownik nie zmienił. Klucz z tą samą
 * wartością w szkicu i we wczytanym dokumencie idzie w całości tak, jak był wczytany. W kluczu zmienionym schodzi
 * w głąb: obiekt zawsze, lista tylko przy tej samej długości po kompaktowaniu (inaczej indeksy się rozjeżdżają).
 */
function restoreUntouchedKeys(target: PlainRecord, loaded: PlainRecord | null, draft: PlainRecord, path = ''): void {
  for (const [key, draftValue] of Object.entries(draft)) {
    const keyPath = path ? `${path}.${key}` : key;
    const linkedKey = LINKED_PATHS[keyPath]?.split('.').pop();
    if (linkedKey !== undefined) {
      const pairUntouched =
        loaded !== null &&
        key in loaded &&
        isSameValue(loaded[key], draftValue) &&
        isSameValue(loaded[linkedKey], draft[linkedKey]);
      if (pairUntouched) target[key] = deepCloneEnrichment(draftValue);
      continue;
    }
    const loadedValue = loaded?.[key];
    if (loaded && key in loaded && isSameValue(loadedValue, draftValue)) {
      target[key] = deepCloneEnrichment(draftValue);
      continue;
    }
    const sent = target[key];
    if (Array.isArray(sent) && Array.isArray(draftValue) && sent.length === draftValue.length) {
      const loadedList = Array.isArray(loadedValue) ? loadedValue : [];
      sent.forEach((entry, index) => {
        const entryRecord = asPlainRecord(entry);
        const draftRecord = asPlainRecord(draftValue[index]);
        if (entryRecord && draftRecord) {
          restoreUntouchedKeys(entryRecord, asPlainRecord(loadedList[index]), draftRecord, `${keyPath}[]`);
        }
      });
      continue;
    }
    const draftRecord = asPlainRecord(draftValue);
    const loadedRecord = asPlainRecord(loadedValue);
    if (!draftRecord || !loadedRecord) continue;
    const sentRecord = asPlainRecord(sent) ?? {};
    restoreUntouchedKeys(sentRecord, loadedRecord, draftRecord, keyPath);
    if (Object.keys(sentRecord).length > 0) target[key] = sentRecord;
  }
}

/**
 * Dokument do zapisu z formularza edycji. Mutacja zastępuje cały dokument, a `composeEnrichmentPayload` wycina puste
 * wartości (`[]`, `null`, pusty tekst), więc zapis jednego pola kasowałby klucze, których nikt nie dotknął
 * (np. `classification.muscles.secondary`, `media[].layout` w rekordzie 3.3, który czytnik uznał za starszy).
 * Tu wracają wszystkie takie klucze z wartością ze szkicu, o ile jest ta sama co we wczytanym dokumencie
 * (`loaded`, kształt edytora z chwili wczytania albo ostatniego zapisu). Pole wyczyszczone przez użytkownika
 * zostaje wycięte jak dotąd. `schemaVersion` przechodzi bez zmian.
 */
export function composeEnrichmentSavePayload(
  loaded: ExerciseEnrichmentData,
  draft: ExerciseEnrichmentData
): ExerciseEnrichmentData {
  const payload = composeEnrichmentPayload(draft);
  const [loadedRecord, draftRecord] = [loaded, draft].map(asPlainRecord);
  if (loadedRecord && draftRecord) restoreUntouchedKeys(payload as PlainRecord, loadedRecord, draftRecord);
  return payload;
}

export function isEnrichmentPayloadEmpty(payload: ExerciseEnrichmentData): boolean {
  const completeness = computeCompleteness(payload);
  return completeness.filled === 0;
}

interface UseEnrichmentDraftOptions {
  /** Initial enrichment (create starts empty). */
  initial?: ExerciseEnrichmentData | null;
}

/**
 * Standalone enrichment draft for create flows (no baseline dirty tracking).
 * Edit flows continue to use useExerciseEditorForm which owns core + enrichment together.
 */
export function useEnrichmentDraft({ initial = null }: UseEnrichmentDraftOptions = {}) {
  const [enrichment, setEnrichment] = useState<ExerciseEnrichmentData>(() => toV3(initial));

  const setPath = useCallback((path: string, value: unknown) => {
    setEnrichment((previous) => {
      const next = deepCloneEnrichment(previous);
      setEnrichmentAtPath(next as Record<string, unknown>, path, value);
      return next;
    });
  }, []);

  const replace = useCallback((next: ExerciseEnrichmentData) => {
    setEnrichment(next);
  }, []);

  const reset = useCallback(() => {
    setEnrichment(toV3(initial));
  }, [initial]);

  const payload = useMemo(() => composeEnrichmentPayload(enrichment), [enrichment]);
  const isEmpty = useMemo(() => isEnrichmentPayloadEmpty(payload), [payload]);
  const completeness = useMemo(() => computeCompleteness(enrichment), [enrichment]);

  /** Create has no baseline — always false. */
  const isPathDirty = useCallback(() => false, []);

  return {
    enrichment,
    setPath,
    replace,
    reset,
    payload,
    isEmpty,
    completeness,
    isPathDirty,
  };
}

export type UseEnrichmentDraftResult = ReturnType<typeof useEnrichmentDraft>;
