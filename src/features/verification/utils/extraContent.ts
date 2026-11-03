import { EXERCISE_CONTENT_LABELS as LABELS } from '@/components/shared/enrichment/enrichmentFieldLabels';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

/** Core scalars that the exercise page shows but the five verification stages do not edit. */
export type ExtraCoreField = 'audioCue' | 'notes';

export type ExtraContentField =
  | { id: string; label: string; kind: 'text'; source: 'enrichment'; path: string }
  | { id: string; label: string; kind: 'list'; source: 'enrichment'; path: string }
  | { id: string; label: string; kind: 'text'; source: 'core'; field: ExtraCoreField };

export interface ExtraContentGroup {
  id: 'patient' | 'therapist' | 'search';
  title: string;
  fields: ExtraContentField[];
}

/**
 * Every content field visible on the exercise page that has no place in the stages,
 * so the reviewer sees all of it before publishing.
 */
export const EXTRA_CONTENT_GROUPS: ExtraContentGroup[] = [
  {
    id: 'patient',
    title: 'Dla pacjenta',
    fields: [
      { id: 'summary', label: LABELS.summary, kind: 'text', source: 'enrichment', path: 'patient.summary' },
      {
        id: 'should-feel',
        label: LABELS.shouldFeel,
        kind: 'text',
        source: 'enrichment',
        path: 'patient.should_feel',
      },
      {
        id: 'should-not-feel',
        label: LABELS.shouldNotFeel,
        kind: 'text',
        source: 'enrichment',
        path: 'patient.should_not_feel',
      },
      { id: 'why', label: LABELS.why, kind: 'text', source: 'enrichment', path: 'patient.why' },
      { id: 'when-to-do', label: LABELS.whenToDo, kind: 'text', source: 'enrichment', path: 'patient.when_to_do' },
      {
        id: 'intensity-guide',
        label: LABELS.intensityGuide,
        kind: 'text',
        source: 'enrichment',
        path: 'safety.intensity_guide',
      },
      { id: 'audio-cue', label: LABELS.audioCue, kind: 'text', source: 'core', field: 'audioCue' },
      { id: 'notes', label: LABELS.notes, kind: 'text', source: 'core', field: 'notes' },
    ],
  },
  {
    id: 'therapist',
    title: 'Dla fizjoterapeuty',
    fields: [
      {
        id: 'clinical-notes',
        label: LABELS.clinicalNotes,
        kind: 'text',
        source: 'enrichment',
        path: 'therapist.clinical_notes',
      },
      {
        id: 'progression-notes',
        label: LABELS.progressionNotes,
        kind: 'text',
        source: 'enrichment',
        path: 'therapist.progression_notes',
      },
      {
        id: 'rehab-phases',
        label: LABELS.rehabPhases,
        kind: 'list',
        source: 'enrichment',
        path: 'therapist.rehab_phases',
      },
      {
        id: 'clinical-benefits',
        label: LABELS.clinicalBenefits,
        kind: 'list',
        source: 'enrichment',
        path: 'therapist.clinical_benefits',
      },
    ],
  },
  {
    id: 'search',
    title: 'Sprzęt i wyszukiwanie',
    fields: [
      { id: 'equipment', label: LABELS.equipment, kind: 'list', source: 'enrichment', path: 'equipment' },
      { id: 'problems', label: LABELS.problems, kind: 'list', source: 'enrichment', path: 'ai.problems' },
      { id: 'suitable-for', label: LABELS.suitableFor, kind: 'list', source: 'enrichment', path: 'ai.suitable_for' },
      {
        id: 'contraindicated-for',
        label: LABELS.contraindicatedFor,
        kind: 'list',
        source: 'enrichment',
        path: 'ai.contraindicated_for',
      },
      { id: 'keywords', label: LABELS.keywords, kind: 'list', source: 'enrichment', path: 'ai.keywords' },
    ],
  },
];

function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

export function readExtraText(
  field: ExtraContentField,
  enrichment: ExerciseEnrichmentData,
  core: Record<ExtraCoreField, string>
): string {
  const value = field.source === 'core' ? core[field.field] : readPath(enrichment, field.path);
  return typeof value === 'string' ? value : '';
}

export function readExtraList(field: ExtraContentField, enrichment: ExerciseEnrichmentData): string[] {
  if (field.source === 'core') return [];
  const value = readPath(enrichment, field.path);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function isExtraFieldFilled(
  field: ExtraContentField,
  enrichment: ExerciseEnrichmentData,
  core: Record<ExtraCoreField, string>
): boolean {
  if (field.kind === 'list') return readExtraList(field, enrichment).some((item) => item.trim().length > 0);
  return readExtraText(field, enrichment, core).trim().length > 0;
}

export function countFilledExtraFields(
  enrichment: ExerciseEnrichmentData,
  core: Record<ExtraCoreField, string>
): { filled: number; total: number } {
  const fields = EXTRA_CONTENT_GROUPS.flatMap((group) => group.fields);
  return {
    filled: fields.filter((field) => isExtraFieldFilled(field, enrichment, core)).length,
    total: fields.length,
  };
}
