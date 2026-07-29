/**
 * SSOT for personalizable patient/safety enrichment content (SPEC-024).
 * Surfaces derive which sections to show — never redefine path lists locally.
 */

import type { ExerciseFieldSurface } from './fieldContract';

/** Whitelisted leaf paths that may appear in mapping/assignment enrichment overrides. */
export const PERSONALIZABLE_ENRICHMENT_PATHS = [
  'patient.summary',
  'patient.steps',
  'patient.cues',
  'patient.mistakes',
  'patient.should_feel',
  'patient.should_not_feel',
  'patient.why',
  'patient.when_to_do',
  'safety.stop_if',
  'safety.intensity_guide',
  'safety.requires_supervision',
] as const;

export type PersonalizableEnrichmentPath = (typeof PERSONALIZABLE_ENRICHMENT_PATHS)[number];

export type ContentSectionId = 'patientLead' | 'executionSteps' | 'audioCues' | 'patientExtras' | 'safety';

export interface ContentSectionDefinition {
  id: ContentSectionId;
  title: string;
  /** Paths owned by this section (for dirty/restore). */
  paths: readonly PersonalizableEnrichmentPath[];
  /** Surfaces that may edit this section when personalizing. */
  surfaces: readonly ExerciseFieldSurface[];
}

/**
 * Canonical content sections for patient-facing enrichment.
 * Editor also shows therapist/metadata outside this contract (template-only).
 */
export const CONTENT_SECTIONS: readonly ContentSectionDefinition[] = [
  {
    id: 'patientLead',
    title: 'Podsumowanie dla pacjenta',
    paths: ['patient.summary'],
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
  },
  {
    id: 'executionSteps',
    title: 'Kroki wykonania',
    paths: ['patient.steps'],
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
  },
  {
    id: 'audioCues',
    title: 'Wskazówki dźwiękowe',
    paths: ['patient.cues'],
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
  },
  {
    id: 'patientExtras',
    title: 'Odczucia i kontekst',
    paths: [
      'patient.mistakes',
      'patient.should_feel',
      'patient.should_not_feel',
      'patient.why',
      'patient.when_to_do',
    ],
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
  },
  {
    id: 'safety',
    title: 'Bezpieczeństwo',
    paths: ['safety.stop_if', 'safety.intensity_guide', 'safety.requires_supervision'],
    surfaces: ['template', 'mapping', 'patientOverride', 'patientPlan'],
  },
] as const;

export function getContentSections(surface: ExerciseFieldSurface): ContentSectionDefinition[] {
  return CONTENT_SECTIONS.filter((section) => section.surfaces.includes(surface));
}

export function isPersonalizableEnrichmentPath(path: string): path is PersonalizableEnrichmentPath {
  return (PERSONALIZABLE_ENRICHMENT_PATHS as readonly string[]).includes(path);
}
