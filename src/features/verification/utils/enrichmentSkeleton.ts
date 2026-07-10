import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import { ENRICHMENT_SCHEMA_V3 } from './enrichmentToV3';

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
    $schema: ENRICHMENT_SCHEMA_V3,
    patient: {
      summary: '',
      steps: [],
      cues: [],
      mistakes: [],
      should_feel: '',
      should_not_feel: '',
      why: '',
      when_to_do: '',
    },
    safety: {
      stop_if: '',
      requires_supervision: false,
    },
    therapist: {
      clinical_notes: '',
      indications: [],
      contraindications: [],
      rehab_phases: [],
      progression_notes: '',
      clinical_benefits: [],
    },
    ai: {
      keywords: [],
    },
    equipment: [],
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
    id: 'summary',
    label: 'Podsumowanie dla pacjenta',
    isFilled: (data) => isNonEmptyText(data.patient?.summary),
  },
  {
    id: 'steps',
    label: 'Kroki wykonania',
    isFilled: (data) => hasArrayItems(data.patient?.steps),
  },
  {
    id: 'cues',
    label: 'Wskazówki (cues)',
    isFilled: (data) => hasArrayItems(data.patient?.cues),
  },
  {
    id: 'mistakes',
    label: 'Typowe błędy',
    isFilled: (data) => hasArrayItems(data.patient?.mistakes),
  },
  {
    id: 'feel',
    label: 'Odczucia pacjenta',
    isFilled: (data) => isNonEmptyText(data.patient?.should_feel) && isNonEmptyText(data.patient?.should_not_feel),
  },
  {
    id: 'why_when',
    label: 'Dlaczego i kiedy wykonywać',
    isFilled: (data) => isNonEmptyText(data.patient?.why) && isNonEmptyText(data.patient?.when_to_do),
  },
  {
    id: 'safety',
    label: 'Bezpieczeństwo',
    isFilled: (data) => isNonEmptyText(data.safety?.stop_if),
  },
  {
    id: 'clinical_notes',
    label: 'Notatki kliniczne',
    isFilled: (data) => isNonEmptyText(data.therapist?.clinical_notes),
  },
  {
    id: 'clinical_indications',
    label: 'Wskazania i przeciwwskazania',
    isFilled: (data) => hasArrayItems(data.therapist?.indications) && hasArrayItems(data.therapist?.contraindications),
  },
  {
    id: 'clinical_benefits',
    label: 'Korzyści kliniczne',
    isFilled: (data) => hasArrayItems(data.therapist?.clinical_benefits),
  },
  {
    id: 'equipment',
    label: 'Sprzęt',
    isFilled: (data) => hasArrayItems(data.equipment),
  },
  {
    id: 'keywords',
    label: 'Słowa kluczowe',
    isFilled: (data) => hasArrayItems(data.ai?.keywords),
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
