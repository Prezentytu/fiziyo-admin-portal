import { z } from 'zod';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { mergeWithSkeleton } from './enrichmentSkeleton';

const patientMistakeSchema = z.object({
  mistake: z.string().optional(),
  fix: z.string().optional(),
});

export const enrichmentSchema = z
  .object({
    $schema: z.string().optional(),
    patient: z
      .object({
        summary: z.string().optional(),
        steps: z.array(z.string()).optional(),
        cues: z.array(z.string()).optional(),
        mistakes: z.array(patientMistakeSchema).optional(),
        should_feel: z.string().optional(),
        should_not_feel: z.string().optional(),
        why: z.string().optional(),
        when_to_do: z.string().optional(),
      })
      .passthrough()
      .optional(),
    safety: z
      .object({
        stop_if: z.string().optional(),
        requires_supervision: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    therapist: z
      .object({
        clinical_notes: z.string().optional(),
        indications: z.array(z.string()).optional(),
        contraindications: z.array(z.string()).optional(),
        rehab_phases: z.array(z.string()).optional(),
        progression_notes: z.string().optional(),
        clinical_benefits: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    ai: z
      .object({
        keywords: z.array(z.string()).optional(),
        problems: z.array(z.string()).optional(),
        suitable_for: z.array(z.string()).optional(),
        contraindicated_for: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    equipment: z.array(z.string()).optional(),
  })
  .passthrough();

export function normalizeEnrichmentData(input: unknown): ExerciseEnrichmentData {
  if (!input || typeof input !== 'object') {
    return {};
  }

  // Na błędzie Zod wracamy do surowego inputu zamiast {} — zapobiega cichemu traceniu danych
  const parsed = enrichmentSchema.safeParse(input);
  return (parsed.success ? parsed.data : input) as ExerciseEnrichmentData;
}

export function parseEnrichmentJson(rawJson: string): ExerciseEnrichmentData {
  const parsedRaw = JSON.parse(rawJson) as unknown;
  const parsed = enrichmentSchema.safeParse(parsedRaw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Nieprawidłowy format danych rozszerzonych.');
  }

  return parsed.data as ExerciseEnrichmentData;
}

export function cleanupEnrichment(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    const cleaned = value.map((entry) => cleanupEnrichment(entry)).filter((entry) => entry !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, cleanupEnrichment(entry)] as const)
      .filter(([, entry]) => entry !== undefined);

    if (entries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(entries);
  }

  return undefined;
}

export function toFullShapeJson(data: ExerciseEnrichmentData): string {
  return JSON.stringify(mergeWithSkeleton(data), null, 2);
}

export function toPrettyJson(data: ExerciseEnrichmentData): string {
  return JSON.stringify(data, null, 2);
}
