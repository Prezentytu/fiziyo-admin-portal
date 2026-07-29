'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { cleanupEnrichment } from '@/features/verification/utils/enrichment';
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
  const cleaned = cleanupEnrichment(draft) as ExerciseEnrichmentData | undefined;
  return { ...cleaned, $schema: ENRICHMENT_SCHEMA_V3 };
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
