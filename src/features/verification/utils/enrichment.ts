import { z } from 'zod';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { mergeWithSkeleton } from './enrichmentSkeleton';

const instructionStepSchema = z.object({
  step: z.number().optional(),
  phase: z.string().optional(),
  text: z.string().optional(),
  image_ref: z.string().nullable().optional(),
  duration_hint_seconds: z.number().optional(),
});

const commonMistakeSchema = z.object({
  mistake: z.string().optional(),
  fix: z.string().optional(),
});

const coachingCueSchema = z.object({
  text: z.string().optional(),
  phases: z.array(z.string()).optional(),
  priority: z.number().optional(),
  repeat: z.boolean().optional(),
});

const phaseSchema = z.object({
  phase_name: z.string().optional(),
  description: z.string().optional(),
});

const feedbackQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().optional(),
});

const dosingProfileSchema = z.object({
  sets: z.number().optional(),
  reps: z.number().optional(),
  duration_seconds: z.number().optional(),
  rest_reps_seconds: z.number().optional(),
  rest_sets_seconds: z.number().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
});

export const enrichmentSchema = z
  .object({
    simplified_instruction: z.string().optional(),
    patient_instruction: z
      .object({
        pre_exercise: z
          .object({
            quick_summary: z.string().optional(),
            safety_note: z.string().optional(),
            what_you_need: z.array(z.string()).optional(),
            instruction_steps: z.array(instructionStepSchema).optional(),
            instruction_steps_simple: z.array(instructionStepSchema).optional(),
            instruction_steps_child: z.array(instructionStepSchema).optional(),
            instruction_steps_technical: z.array(instructionStepSchema).optional(),
          })
          .passthrough()
          .optional(),
        during_exercise: z
          .object({
            phases: z.array(phaseSchema).optional(),
          })
          .passthrough()
          .optional(),
        post_exercise: z
          .object({
            completion_message: z.string().optional(),
            feedback_questions: z.array(feedbackQuestionSchema).optional(),
            patient_note_prompt: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    common_mistakes: z.array(commonMistakeSchema).optional(),
    patient_notes: z
      .object({
        why_this_exercise: z.string().optional(),
        technique_reminders: z.array(z.string()).optional(),
        when_to_do: z.string().optional(),
      })
      .passthrough()
      .optional(),
    therapist_notes: z
      .object({
        clinical_notes: z.string().optional(),
        clinical_indications: z.array(z.string()).optional(),
        contraindications: z.array(z.string()).optional(),
        rehab_phase: z.array(z.string()).optional(),
        coaching_cues: z.array(coachingCueSchema).optional(),
        clinical_benefits: z.array(z.string()).optional(),
        progression_notes: z.string().optional(),
      })
      .passthrough()
      .optional(),
    dosing_profiles: z.record(z.string(), dosingProfileSchema).optional(),
    safety: z
      .object({
        stop_if: z.string().optional(),
        intensity_guide: z.string().optional(),
        requires_supervision: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    feel_description: z
      .object({
        should_feel: z.string().optional(),
        should_not_feel: z.string().optional(),
      })
      .passthrough()
      .optional(),
    ai_metadata: z
      .object({
        search_keywords: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
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
