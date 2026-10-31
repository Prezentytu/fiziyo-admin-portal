import { describe, expect, it } from 'vitest';
import { seedBuilderParamsFromMapping } from '../seedBuilderParamsFromMapping';
import type { ExerciseMapping } from '../../types';

describe('seedBuilderParamsFromMapping', () => {
  it('seeduje dawkowanie z mappingu i klasyfikację z overridesJson', () => {
    const mapping: ExerciseMapping = {
      id: 'm1',
      exerciseId: 'e1',
      sets: 4,
      reps: 8,
      executionTime: 3,
      restSets: 90,
      overridesJson: JSON.stringify({
        exerciseSide: 'left',
        difficultyLevel: 'HARD',
        patientDescription: 'Wersja z zestawu',
      }),
      exercise: {
        id: 'e1',
        name: 'Martwy ciąg',
        side: 'both',
        difficultyLevel: 'MEDIUM',
        patientDescription: 'Szablon',
        audioCue: 'Szablon cue',
      },
    };

    const params = seedBuilderParamsFromMapping(mapping);
    expect(params.sets).toBe(4);
    expect(params.reps).toBe(8);
    expect(params.exerciseSide).toBe('left');
    expect(params.difficultyLevel).toBe('HARD');
    expect(params.patientDescription).toBe('Wersja z zestawu');
    expect(params.audioCue).toBe('Szablon cue');
  });

  it('bez overridesJson bierze wartości z szablonu ćwiczenia', () => {
    const mapping: ExerciseMapping = {
      id: 'm2',
      exerciseId: 'e2',
      sets: 3,
      exercise: {
        id: 'e2',
        name: 'Przysiad',
        side: 'RIGHT',
        rangeOfMotion: 'pełny',
      },
    };

    const params = seedBuilderParamsFromMapping(mapping);
    expect(params.exerciseSide).toBe('RIGHT');
    expect(params.rangeOfMotion).toBe('pełny');
  });

  it('seeduje enrichment z overridesJson na szablon', () => {
    const mapping: ExerciseMapping = {
      id: 'm3',
      exerciseId: 'e3',
      overridesJson: JSON.stringify({
        enrichment: { patient: { steps: ['Krok z zestawu'] } },
      }),
      exercise: {
        id: 'e3',
        name: 'Mostek',
        enrichmentData: {
          $schema: 'fiziyo-exercise-v3',
          patient: { steps: ['Krok szablon'], cues: ['Cue'] },
          therapist: { clinical_notes: 'Keep' },
        },
      },
    };

    const params = seedBuilderParamsFromMapping(mapping);
    expect(params.enrichment?.patient?.steps).toEqual(['Krok z zestawu']);
    expect(params.enrichment?.patient?.cues).toEqual(['Cue']);
    expect(params.enrichment?.therapist?.clinical_notes).toBe('Keep');
  });
});

describe('seedBuilderParamsFromMapping when the exercise content was not loaded', () => {
  const steps = { $schema: 'fiziyo-exercise-v3', patient: { steps: ['Krok z zestawu'] } };

  it('keeps only the inherited content override instead of a blank template plus override', () => {
    const mapping: ExerciseMapping = {
      id: 'm9',
      exerciseId: 'e9',
      overridesJson: JSON.stringify({ enrichment: { patient: { steps: ['Krok z zestawu'] } } }),
      exercise: { id: 'e9', name: 'Bez treści w odpowiedzi' },
    };

    const params = seedBuilderParamsFromMapping(mapping);

    expect(params.enrichment).toBeUndefined();
    expect(params.enrichmentOverride).toEqual({ patient: { steps: ['Krok z zestawu'] } });
  });

  it('seeds the full content when the exercise content was loaded', () => {
    const mapping: ExerciseMapping = {
      id: 'm10',
      exerciseId: 'e10',
      exercise: { id: 'e10', name: 'Z treścią', enrichmentData: steps },
    };

    expect(seedBuilderParamsFromMapping(mapping).enrichment?.patient?.steps).toEqual(['Krok z zestawu']);
  });
});

