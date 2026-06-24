import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

export interface EnrichmentSectionMeta {
  id: string;
  label: string;
  isFilled: (data: ExerciseEnrichmentData) => boolean;
}

export interface EnrichmentCompleteness {
  filled: number;
  total: number;
  missing: EnrichmentSectionMeta[];
}

export function createEnrichmentSkeleton(): ExerciseEnrichmentData {
  return {
    simplified_instruction: '',
    patient_notes: {
      why_this_exercise: '',
      technique_reminders: [],
      when_to_do: '',
    },
    safety: {
      stop_if: '',
      intensity_guide: '',
      requires_supervision: false,
    },
    feel_description: {
      should_feel: '',
      should_not_feel: '',
    },
    common_mistakes: [],
    dosing_profiles: {},
    therapist_notes: {
      clinical_notes: '',
      clinical_indications: [],
      contraindications: [],
      rehab_phase: [],
      coaching_cues: [],
      clinical_benefits: [],
      progression_notes: '',
    },
    patient_instruction: {
      pre_exercise: {
        quick_summary: '',
        safety_note: '',
        what_you_need: [],
        instruction_steps: [],
        instruction_steps_simple: [],
        instruction_steps_child: [],
        instruction_steps_technical: [],
      },
      during_exercise: {
        phases: [],
      },
      post_exercise: {
        completion_message: '',
        feedback_questions: [],
        patient_note_prompt: '',
      },
    },
    ai_metadata: {
      search_keywords: [],
    },
  };
}

function isNonEmptyText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasArrayItems(value: unknown[] | null | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

function deepMerge(source: unknown, patch: unknown): unknown {
  if (patch === undefined || patch === null) {
    return source;
  }

  if (Array.isArray(patch)) {
    return patch;
  }

  if (typeof patch !== 'object') {
    return patch;
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return patch;
  }

  const sourceRecord = source as Record<string, unknown>;
  const patchRecord = patch as Record<string, unknown>;
  const result: Record<string, unknown> = { ...sourceRecord };

  for (const [key, value] of Object.entries(patchRecord)) {
    result[key] = key in result ? deepMerge(result[key], value) : value;
  }

  return result;
}

export function mergeWithSkeleton(data: ExerciseEnrichmentData): ExerciseEnrichmentData {
  const skeleton = createEnrichmentSkeleton();
  return deepMerge(skeleton, data) as ExerciseEnrichmentData;
}

export const ENRICHMENT_SECTIONS: EnrichmentSectionMeta[] = [
  {
    id: 'simplified_instruction',
    label: 'Uproszczona instrukcja',
    isFilled: (data) => isNonEmptyText(data.simplified_instruction),
  },
  {
    id: 'pre_exercise_core',
    label: 'Podsumowanie i bezpieczeństwo przed ćwiczeniem',
    isFilled: (data) =>
      isNonEmptyText(data.patient_instruction?.pre_exercise?.quick_summary)
      && isNonEmptyText(data.patient_instruction?.pre_exercise?.safety_note),
  },
  {
    id: 'what_you_need',
    label: 'Co jest potrzebne',
    isFilled: (data) => hasArrayItems(data.patient_instruction?.pre_exercise?.what_you_need),
  },
  {
    id: 'instruction_steps',
    label: 'Kroki wykonania',
    isFilled: (data) => hasArrayItems(data.patient_instruction?.pre_exercise?.instruction_steps),
  },
  {
    id: 'during_phases',
    label: 'Fazy podczas ćwiczenia',
    isFilled: (data) => hasArrayItems(data.patient_instruction?.during_exercise?.phases),
  },
  {
    id: 'post_exercise',
    label: 'Sekcja po ćwiczeniu',
    isFilled: (data) =>
      isNonEmptyText(data.patient_instruction?.post_exercise?.completion_message)
      && isNonEmptyText(data.patient_instruction?.post_exercise?.patient_note_prompt),
  },
  {
    id: 'feel_description',
    label: 'Odczucia pacjenta',
    isFilled: (data) =>
      isNonEmptyText(data.feel_description?.should_feel) && isNonEmptyText(data.feel_description?.should_not_feel),
  },
  {
    id: 'safety',
    label: 'Bezpieczeństwo i intensywność',
    isFilled: (data) => isNonEmptyText(data.safety?.stop_if) && isNonEmptyText(data.safety?.intensity_guide),
  },
  {
    id: 'mistakes',
    label: 'Typowe błędy',
    isFilled: (data) => hasArrayItems(data.common_mistakes),
  },
  {
    id: 'coaching_cues',
    label: 'Wskazówki werbalne',
    isFilled: (data) => hasArrayItems(data.therapist_notes?.coaching_cues),
  },
  {
    id: 'clinical_notes',
    label: 'Notatki kliniczne',
    isFilled: (data) => isNonEmptyText(data.therapist_notes?.clinical_notes),
  },
  {
    id: 'dosing',
    label: 'Dawkowanie',
    isFilled: (data) => !!data.dosing_profiles && Object.keys(data.dosing_profiles).length > 0,
  },
  {
    id: 'keywords',
    label: 'Słowa kluczowe',
    isFilled: (data) => hasArrayItems(data.ai_metadata?.search_keywords),
  },
];

export function computeCompleteness(data: ExerciseEnrichmentData): EnrichmentCompleteness {
  const missing = ENRICHMENT_SECTIONS.filter((section) => !section.isFilled(data));
  return {
    filled: ENRICHMENT_SECTIONS.length - missing.length,
    total: ENRICHMENT_SECTIONS.length,
    missing,
  };
}
