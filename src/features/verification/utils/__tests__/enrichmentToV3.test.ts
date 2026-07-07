import { describe, expect, it } from 'vitest';

import { ENRICHMENT_SCHEMA_V3, toV3 } from '../enrichmentToV3';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

describe('toV3', () => {
  it('zwraca sam marker $schema dla null/undefined', () => {
    expect(toV3(null)).toEqual({ $schema: ENRICHMENT_SCHEMA_V3 });
    expect(toV3(undefined)).toEqual({ $schema: ENRICHMENT_SCHEMA_V3 });
  });

  it('jest idempotentny dla danych już w v3', () => {
    const v3Data: ExerciseEnrichmentData = {
      $schema: ENRICHMENT_SCHEMA_V3,
      patient: { summary: 'Podsumowanie', steps: ['Krok 1'] },
    };

    const result = toV3(v3Data);

    expect(result).toEqual(v3Data);
    expect(result).not.toBe(v3Data);
  });

  it('mapuje pola v2 patient_instruction/feel_description/therapist_notes na v3', () => {
    const v2Data: ExerciseEnrichmentData = {
      simplified_instruction: 'Uproszczony opis',
      patient_instruction: {
        pre_exercise: {
          quick_summary: 'Krótkie podsumowanie',
          instruction_steps: [
            { step: 1, text: 'Usiądź prosto' },
            { step: 2, text: 'Wyprostuj nogę' },
          ],
        },
      },
      common_mistakes: [{ mistake: 'Zbyt szybkie tempo', fix: 'Zwolnij' }],
      feel_description: { should_feel: 'Lekkie napięcie', should_not_feel: 'Ból' },
      safety: { stop_if: 'Ostry ból', intensity_guide: 'Umiarkowana', requires_supervision: true },
      patient_notes: {
        why_this_exercise: 'Wzmacnia core',
        when_to_do: 'Rano',
        technique_reminders: ['Trzymaj brzuch spięty'],
      },
      therapist_notes: {
        clinical_notes: 'Notatka kliniczna',
        clinical_indications: ['Ból lędźwiowy'],
        contraindications: ['Ostry stan zapalny'],
        rehab_phase: ['wczesna'],
        coaching_cues: [{ text: 'Nie unoś barków' }],
        clinical_benefits: ['Stabilizacja centralna'],
        progression_notes: 'Zwiększ liczbę powtórzeń',
      },
      ai_metadata: { search_keywords: ['core', 'stabilizacja'] },
    };

    const result = toV3(v2Data);

    expect(result.$schema).toBe(ENRICHMENT_SCHEMA_V3);
    expect(result.patient?.summary).toBe('Krótkie podsumowanie');
    expect(result.patient?.steps).toEqual(['Usiądź prosto', 'Wyprostuj nogę']);
    expect(result.patient?.cues).toEqual(['Nie unoś barków', 'Trzymaj brzuch spięty']);
    expect(result.patient?.mistakes).toEqual([{ mistake: 'Zbyt szybkie tempo', fix: 'Zwolnij' }]);
    expect(result.patient?.should_feel).toBe('Lekkie napięcie');
    expect(result.patient?.should_not_feel).toBe('Ból');
    expect(result.patient?.why).toBe('Wzmacnia core');
    expect(result.patient?.when_to_do).toBe('Rano');
    expect(result.safety?.stop_if).toBe('Ostry ból');
    expect(result.safety?.requires_supervision).toBe(true);
    expect(result.therapist?.clinical_notes).toBe('Notatka kliniczna');
    expect(result.therapist?.indications).toEqual(['Ból lędźwiowy']);
    expect(result.therapist?.contraindications).toEqual(['Ostry stan zapalny']);
    expect(result.therapist?.rehab_phases).toEqual(['wczesna']);
    expect(result.therapist?.clinical_benefits).toEqual(['Stabilizacja centralna']);
    expect(result.therapist?.progression_notes).toBe('Zwiększ liczbę powtórzeń');
    expect(result.ai?.keywords).toEqual(['core', 'stabilizacja']);
  });

  it('używa simplified_instruction gdy brak quick_summary', () => {
    const result = toV3({ simplified_instruction: 'Opis zapasowy' });
    expect(result.patient?.summary).toBe('Opis zapasowy');
  });

  it('zachowuje safety.intensity_guide jako osobne pole v3', () => {
    const result = toV3({ safety: { intensity_guide: 'Łagodna intensywność' } });
    expect(result.safety?.intensity_guide).toBe('Łagodna intensywność');
    expect(result.safety?.stop_if).toBeUndefined();
  });

  it('nie przenosi legacy pól v2 do wyniku', () => {
    const result = toV3({
      simplified_instruction: 'Opis',
      patient_instruction: { pre_exercise: { quick_summary: 'Podsumowanie' } },
      dosing_profiles: { default: { sets: 3 } },
    });

    expect(result).not.toHaveProperty('simplified_instruction');
    expect(result).not.toHaveProperty('patient_instruction');
    expect(result).not.toHaveProperty('dosing_profiles');
  });

  it('zwraca puste pola v3 gdy wejście jest pustym obiektem', () => {
    const result = toV3({});
    expect(result).toEqual({ $schema: ENRICHMENT_SCHEMA_V3 });
  });
});
