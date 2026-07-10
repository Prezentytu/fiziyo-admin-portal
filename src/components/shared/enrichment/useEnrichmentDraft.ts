'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { cleanupEnrichment } from '@/features/verification/utils/enrichment';
import { ENRICHMENT_SCHEMA_V3, toV3 } from '@/features/verification/utils/enrichmentToV3';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setAtPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = target;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    const currentValue = current[key];
    if (!currentValue || typeof currentValue !== 'object' || Array.isArray(currentValue)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const finalKey = keys[keys.length - 1];
  current[finalKey] = value;
}

interface UseEnrichmentDraftParams {
  enrichmentData?: ExerciseEnrichmentData | null;
  onFieldChange: (field: string, value: unknown) => Promise<void>;
}

export function useEnrichmentDraft({ enrichmentData, onFieldChange }: UseEnrichmentDraftParams) {
  const [draft, setDraft] = useState<ExerciseEnrichmentData>({});

  useEffect(() => {
    // Konwersja v2 -> v3 raz przy wczytaniu — od tego momentu edytor operuje wyłącznie
    // na kształcie v3 (SPEC-022). Patrz docs/architecture/admin-enrichment-v3-migration-plan.md.
    setDraft(toV3(enrichmentData));
  }, [enrichmentData]);

  const setPath = useCallback((path: string, value: unknown) => {
    setDraft((prev) => {
      const next = deepClone(prev);
      setAtPath(next as Record<string, unknown>, path, value);
      return next;
    });
  }, []);

  const updateDraft = useCallback((updater: (current: ExerciseEnrichmentData) => ExerciseEnrichmentData) => {
    setDraft((prev) => updater(deepClone(prev)));
  }, []);

  const composePayload = useCallback((): ExerciseEnrichmentData => {
    const cleaned = cleanupEnrichment(draft);
    // $schema musi przetrwać cleanup (nie jest polem "wypełnianym" przez użytkownika),
    // żeby backendowy normalizer traktował payload jako już-v3 i nie próbował go renormalizować.
    return { ...(cleaned as ExerciseEnrichmentData | undefined), $schema: ENRICHMENT_SCHEMA_V3 };
  }, [draft]);

  const persist = useCallback(async () => {
    const payload = composePayload();
    await onFieldChange('enrichmentData', payload);
    setDraft(payload);
  }, [composePayload, onFieldChange]);

  return useMemo(
    () => ({
      draft,
      setDraft,
      setPath,
      updateDraft,
      composePayload,
      persist,
    }),
    [composePayload, draft, persist, setPath, updateDraft]
  );
}
