import { describe, expect, it } from 'vitest';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import {
  applyEnrichmentOverride,
  buildEnrichmentOverrideDelta,
  hasEnrichmentOverrideContent,
  listOverriddenEnrichmentPaths,
  mergeEnrichmentOverrides,
  parseEnrichmentOverride,
} from '../enrichmentOverride';
import { CONTENT_SECTIONS, PERSONALIZABLE_ENRICHMENT_PATHS, getContentSections } from '../contentContract';

const template: ExerciseEnrichmentData = {
  $schema: 'fiziyo-exercise-v3',
  patient: {
    summary: 'Szablon summary',
    steps: ['Krok 1', 'Krok 2'],
    cues: ['Wdech'],
    should_feel: 'Napięcie',
  },
  safety: {
    stop_if: 'Ból',
    requires_supervision: false,
  },
  therapist: {
    clinical_notes: 'Tylko szablon',
  },
};

describe('contentContract', () => {
  it('PERSONALIZABLE_ENRICHMENT_PATHS ma 11 ścieżek patient+safety', () => {
    expect(PERSONALIZABLE_ENRICHMENT_PATHS).toHaveLength(11);
    expect(PERSONALIZABLE_ENRICHMENT_PATHS.every((path) => path.startsWith('patient.') || path.startsWith('safety.'))).toBe(
      true
    );
  });

  it('CONTENT_SECTIONS pokrywają wszystkie personalizable paths', () => {
    const covered = new Set(CONTENT_SECTIONS.flatMap((section) => section.paths));
    for (const path of PERSONALIZABLE_ENRICHMENT_PATHS) {
      expect(covered.has(path)).toBe(true);
    }
  });

  it('getContentSections(patientPlan) zwraca wszystkie sekcje', () => {
    expect(getContentSections('patientPlan').map((section) => section.id)).toEqual([
      'patientLead',
      'executionSteps',
      'audioCues',
      'patientExtras',
      'safety',
    ]);
  });
});

describe('enrichmentOverride', () => {
  it('buildEnrichmentOverrideDelta zwraca tylko zmienione ścieżki', () => {
    const delta = buildEnrichmentOverrideDelta(template, {
      ...template,
      patient: {
        ...template.patient,
        steps: ['Zmieniony krok'],
        cues: ['Wdech'],
      },
    });
    expect(delta).toEqual({
      patient: { steps: ['Zmieniony krok'] },
    });
  });

  it('buildEnrichmentOverrideDelta zwraca undefined gdy brak różnic', () => {
    expect(buildEnrichmentOverrideDelta(template, template)).toBeUndefined();
  });

  it('buildEnrichmentOverrideDelta clearuje ścieżkę pustą tablicą/stringiem', () => {
    const delta = buildEnrichmentOverrideDelta(template, {
      ...template,
      patient: { ...template.patient, steps: [], cues: ['Wdech'] },
    });
    expect(delta).toEqual({ patient: { steps: [] } });
  });

  it('applyEnrichmentOverride nakłada delty i zachowuje therapist', () => {
    const effective = applyEnrichmentOverride(template, {
      patient: { steps: ['Nowy'] },
      safety: { stop_if: 'Ostry ból' },
    });
    expect(effective.patient?.steps).toEqual(['Nowy']);
    expect(effective.patient?.summary).toBe('Szablon summary');
    expect(effective.safety?.stop_if).toBe('Ostry ból');
    expect(effective.therapist?.clinical_notes).toBe('Tylko szablon');
  });

  it('applyEnrichmentOverride jest idempotentny przy pustym override', () => {
    expect(applyEnrichmentOverride(template, {})).toEqual(applyEnrichmentOverride(template, null));
  });

  it('parseEnrichmentOverride filtruje do whitelist i odrzuca therapist', () => {
    const parsed = parseEnrichmentOverride({
      patient: { steps: ['A'], summary: 'S' },
      therapist: { clinical_notes: 'X' },
      ai: { keywords: ['k'] },
    });
    expect(parsed).toEqual({ patient: { steps: ['A'], summary: 'S' } });
  });

  it('mergeEnrichmentOverrides: overlay wygrywa per-path', () => {
    const merged = mergeEnrichmentOverrides(
      { patient: { steps: ['M'], cues: ['C'] } },
      { patient: { steps: ['A'] }, safety: { stop_if: 'Stop' } }
    );
    expect(merged).toEqual({
      patient: { steps: ['A'], cues: ['C'] },
      safety: { stop_if: 'Stop' },
    });
  });

  it('hasEnrichmentOverrideContent / listOverriddenEnrichmentPaths', () => {
    expect(hasEnrichmentOverrideContent(undefined)).toBe(false);
    expect(hasEnrichmentOverrideContent({ patient: { steps: ['x'] } })).toBe(true);
    expect(listOverriddenEnrichmentPaths({ patient: { steps: ['x'], cues: ['c'] } })).toEqual([
      'patient.steps',
      'patient.cues',
    ]);
  });
});
