// Błąd P-1 (lab 15.11.2026): zmiana fazy wskazówki (`patient.cue_phases`) w personalizacji ćwiczenia w zestawie
// znika po cichu — zapis zgłasza sukces, `overridesJson` zostaje NULL, a po ponownym otwarciu znów jest „Praca”.
// Przyczyna: `patient.cue_phases` nie ma w PERSONALIZABLE_ENRICHMENT_PATHS, więc delta i odczyt go pomijają.
import { describe, expect, it } from 'vitest';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';
import {
  applyEnrichmentOverride,
  buildEnrichmentOverrideDelta,
} from '../enrichmentOverride';
import { buildMappingOverridesJson, parseMappingOverridesJson } from '../mappingOverrides';
import { buildMappingOverridesFromParams } from '@/features/exercise-sets/utils/buildMappingOverridesFromParams';

// Minimalny wycinek prawdziwego rekordu 3.3 (fiziyo-fx-2011, baza lab v33_1114).
function templateV33(): ExerciseEnrichmentData {
  return {
    $schema: 'fiziyo-exercise-v3',
    schemaVersion: '3.3',
    patient: {
      summary: 'Uginanie łokcia z hantlem w staniu, z kciukiem skierowanym w górę.',
      steps: ['Stań prosto, stopy na szerokość bioder.', 'Z wydechem zegnij łokieć.'],
      cues: ['Zegnij łokieć, hantel do barku.', 'Łokieć zostaje przy boku.', 'Kciuk z przodu, łokieć przy boku.'],
      cue_phases: [
        { cue: 0, phase: 'work' },
        { cue: 1, phase: 'work' },
        { cue: 2, phase: 'preparation' },
      ],
    },
    safety: { stop_if: 'Ostry ból w łokciu – przerwij.', pain_rule: 'WS-3', requires_supervision: false },
  } as ExerciseEnrichmentData;
}

/** Fizjoterapeuta zmienia tylko fazę pierwszej wskazówki: „Praca” → „Przygotowanie”. */
function withFirstCueInPreparation(): ExerciseEnrichmentData {
  const desired = templateV33();
  const patient = desired.patient as { cue_phases: Array<{ cue: number; phase: string }> };
  patient.cue_phases = [
    { cue: 0, phase: 'preparation' },
    { cue: 1, phase: 'work' },
    { cue: 2, phase: 'preparation' },
  ];
  return desired;
}

describe('personalizacja fazy wskazówki (P-1)', () => {
  it('delta treści po zmianie samej fazy wskazówki nie jest pusta i niesie nową fazę', () => {
    const delta = buildEnrichmentOverrideDelta(templateV33(), withFirstCueInPreparation());

    expect(delta).toBeDefined();
    expect((delta?.patient as Record<string, unknown> | undefined)?.cue_phases).toEqual([
      { cue: 0, phase: 'preparation' },
      { cue: 1, phase: 'work' },
      { cue: 2, phase: 'preparation' },
    ]);
  });

  it('overridesJson z okna „Edytuj parametry” zawiera zmianę fazy (nie NULL)', () => {
    // To samo złożenie co EditExerciseInSetDialog.handleSave.
    const template = templateV33();
    const enrichmentDelta = buildEnrichmentOverrideDelta(template, withFirstCueInPreparation());
    const overridesJson = buildMappingOverridesJson({}, {}, enrichmentDelta);

    expect(overridesJson).not.toBeNull();
    expect(JSON.parse(overridesJson ?? '{}')).toMatchObject({
      enrichment: { patient: { cue_phases: [{ cue: 0, phase: 'preparation' }, { cue: 1, phase: 'work' }, { cue: 2, phase: 'preparation' }] } },
    });
  });

  it('overridesJson z kreatora zestawu (buildMappingOverridesFromParams) zawiera zmianę fazy', () => {
    const json = buildMappingOverridesFromParams(
      { enrichmentData: templateV33() },
      { enrichment: withFirstCueInPreparation() } as Parameters<typeof buildMappingOverridesFromParams>[1]
    );

    expect(json).not.toBeNull();
  });

  it('po ponownym otwarciu nadpisanie przywraca zapisaną fazę zamiast „Praca” z szablonu', () => {
    const overrideJson = JSON.stringify({
      enrichment: { patient: { cue_phases: [{ cue: 0, phase: 'preparation' }, { cue: 1, phase: 'work' }, { cue: 2, phase: 'preparation' }] } },
    });
    const parsed = parseMappingOverridesJson(overrideJson);
    const effective = applyEnrichmentOverride(templateV33(), parsed?.enrichment);

    expect((effective.patient as Record<string, unknown>).cue_phases).toEqual([
      { cue: 0, phase: 'preparation' },
      { cue: 1, phase: 'work' },
      { cue: 2, phase: 'preparation' },
    ]);
  });
});
