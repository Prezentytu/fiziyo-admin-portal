import { describe, expect, it } from 'vitest';

import { hasExerciseOverrideContent } from '../exerciseOverride';
import {
  estimateEffectiveExerciseSeconds,
  resolveEffectiveExerciseParams,
} from '../resolveEffectiveExerciseParams';

const baseMapping = {
  id: 'mapping-1',
  sets: 3,
  reps: 10,
  executionTime: 5,
  restSets: 60,
  tempo: '2-0-2-0',
  load: { type: 'weight' as const, value: 8, unit: 'kg' as const, text: '8 kg', loadWeightKg: 8 },
  customName: undefined as string | undefined,
  exercise: {
    name: 'Przysiad',
    defaultSets: 3,
    defaultReps: 12,
    defaultExecutionTime: 4,
    defaultRestBetweenSets: 45,
    preparationTime: 10,
    tempo: '3-0-1-0',
    side: 'BOTH',
    exerciseSide: 'both',
    rangeOfMotion: 'pełny',
    difficultyLevel: 'MEDIUM',
    defaultLoad: {
      type: 'weight' as const,
      value: 5,
      unit: 'kg' as const,
      text: '5 kg',
      loadWeightKg: 5,
    },
  },
};

describe('resolveEffectiveExerciseParams', () => {
  it('uses mapping over template when override is absent', () => {
    const result = resolveEffectiveExerciseParams(baseMapping);

    expect(result.sets).toBe(3);
    expect(result.reps).toBe(10);
    expect(result.executionTime).toBe(5);
    expect(result.restSets).toBe(60);
    expect(result.tempo).toBe('2-0-2-0');
    expect(result.loadKg).toBe(8);
    expect(result.side).toBe('both');
    expect(result.rangeOfMotion).toBe('pełny');
    expect(result.preparationTime).toBe(10);
    expect(result.overriddenKeys).toEqual([]);
  });

  it('applies override precedence for loadWeightKg, ROM and side', () => {
    const result = resolveEffectiveExerciseParams(baseMapping, {
      loadWeightKg: 12.5,
      rangeOfMotion: '90°',
      exerciseSide: 'left',
      tempo: '1-0-1-0',
      preparationTime: 3,
    });

    expect(result.loadKg).toBe(12.5);
    expect(result.rangeOfMotion).toBe('90°');
    expect(result.side).toBe('left');
    expect(result.tempo).toBe('1-0-1-0');
    expect(result.preparationTime).toBe(3);
    expect(result.overriddenKeys).toEqual(
      expect.arrayContaining(['loadWeightKg', 'rangeOfMotion', 'exerciseSide', 'tempo', 'preparationTime'])
    );
  });

  it('dual-reads legacy override.load for loadKg', () => {
    const result = resolveEffectiveExerciseParams(baseMapping, {
      load: { type: 'weight', value: 15, unit: 'kg', text: '15 kg', loadWeightKg: 15 },
    });

    expect(result.loadKg).toBe(15);
  });

  it('does not coerce missing override fields to zero', () => {
    const result = resolveEffectiveExerciseParams(
      {
        ...baseMapping,
        executionTime: undefined,
        exercise: { ...baseMapping.exercise, defaultExecutionTime: undefined },
      },
      { sets: 4 }
    );

    expect(result.sets).toBe(4);
    expect(result.executionTime).toBeUndefined();
    expect(result.reps).toBe(10);
  });

  it('prefers override customName for displayName', () => {
    const result = resolveEffectiveExerciseParams(baseMapping, { customName: 'Przysiad A' });
    expect(result.displayName).toBe('Przysiad A');
  });

  it('applies override precedence for difficultyLevel and description fields', () => {
    const mappingWithTexts = {
      ...baseMapping,
      exercise: {
        ...baseMapping.exercise,
        patientDescription: 'Szablon pacjent',
        clinicalDescription: 'Szablon kliniczny',
        audioCue: 'Szablon cue',
      },
    };
    const result = resolveEffectiveExerciseParams(mappingWithTexts, {
      difficultyLevel: 'HARD',
      patientDescription: 'Override pacjent',
      clinicalDescription: 'Override kliniczny',
      audioCue: 'Override cue',
    });

    expect(result.difficultyLevel).toBe('HARD');
    expect(result.patientDescription).toBe('Override pacjent');
    expect(result.clinicalDescription).toBe('Override kliniczny');
    expect(result.audioCue).toBe('Override cue');
  });

  it('falls back to template difficulty and texts when override absent', () => {
    const result = resolveEffectiveExerciseParams({
      ...baseMapping,
      exercise: {
        ...baseMapping.exercise,
        patientDescription: 'Szablon pacjent',
        clinicalDescription: 'Szablon kliniczny',
        audioCue: 'Szablon cue',
      },
    });
    expect(result.difficultyLevel).toBe('MEDIUM');
    expect(result.patientDescription).toBe('Szablon pacjent');
    expect(result.clinicalDescription).toBe('Szablon kliniczny');
    expect(result.audioCue).toBe('Szablon cue');
  });

  it('applies mapping.overridesJson under assignment override (SPEC-023)', () => {
    const result = resolveEffectiveExerciseParams(
      {
        ...baseMapping,
        overridesJson: JSON.stringify({
          exerciseSide: 'left',
          rangeOfMotion: '0–90°',
          difficultyLevel: 'HARD',
          patientDescription: 'Mapping patient',
        }),
        exercise: {
          ...baseMapping.exercise,
          patientDescription: 'Template patient',
          rangeOfMotion: 'pełny',
          difficultyLevel: 'EASY',
        },
      },
      {
        exerciseSide: 'right',
        patientDescription: 'Assignment patient',
      }
    );

    expect(result.side).toBe('right');
    expect(result.rangeOfMotion).toBe('0–90°');
    expect(result.difficultyLevel).toBe('HARD');
    expect(result.patientDescription).toBe('Assignment patient');
  });

  it('uses mapping.overridesJson when assignment override absent', () => {
    const result = resolveEffectiveExerciseParams({
      ...baseMapping,
      overridesJson: {
        exerciseSide: 'alternating',
        audioCue: 'Mapping cue',
      },
    });

    expect(result.side).toBe('alternating');
    expect(result.audioCue).toBe('Mapping cue');
  });

  it('effectiveEnrichment: assignment > mapping > template (path-level)', () => {
    const result = resolveEffectiveExerciseParams(
      {
        ...baseMapping,
        overridesJson: JSON.stringify({
          enrichment: {
            patient: { steps: ['Mapping step'], cues: ['Mapping cue'] },
          },
        }),
        exercise: {
          ...baseMapping.exercise,
          enrichmentData: {
            $schema: 'fiziyo-exercise-v3',
            patient: {
              summary: 'Template summary',
              steps: ['Template step'],
              cues: ['Template cue'],
            },
            safety: { stop_if: 'Template stop' },
            therapist: { clinical_notes: 'Keep therapist' },
          },
        },
      },
      {
        enrichment: {
          patient: { steps: ['Assignment step'] },
          safety: { stop_if: 'Assignment stop' },
        },
      }
    );

    expect(result.effectiveEnrichment.patient?.steps).toEqual(['Assignment step']);
    expect(result.effectiveEnrichment.patient?.cues).toEqual(['Mapping cue']);
    expect(result.effectiveEnrichment.patient?.summary).toBe('Template summary');
    expect(result.effectiveEnrichment.safety?.stop_if).toBe('Assignment stop');
    expect(result.effectiveEnrichment.therapist?.clinical_notes).toBe('Keep therapist');
    expect(result.overriddenKeys).toContain('enrichment');
  });
});

describe('hasExerciseOverrideContent', () => {
  it('detects extended override fields', () => {
    expect(hasExerciseOverrideContent({ tempo: '2-0-2-0' })).toBe(true);
    expect(hasExerciseOverrideContent({ loadWeightKg: 5 })).toBe(true);
    expect(hasExerciseOverrideContent({ exerciseSide: 'left' })).toBe(true);
    expect(hasExerciseOverrideContent({ rangeOfMotion: '90' })).toBe(true);
    expect(hasExerciseOverrideContent({ difficultyLevel: 'HARD' })).toBe(true);
    expect(hasExerciseOverrideContent({ patientDescription: 'x' })).toBe(true);
    expect(hasExerciseOverrideContent({})).toBe(false);
    expect(hasExerciseOverrideContent({ hidden: false })).toBe(false);
    expect(hasExerciseOverrideContent({ customImages: [] })).toBe(false);
  });
});

describe('resolveEffectiveExerciseParams: kanon i enumy', () => {
  it('bez wartości w mappingu i ćwiczeniu daje kanon: serie 3, przerwa 60, przerwa między powtórzeniami 0, przygotowanie 5', () => {
    const result = resolveEffectiveExerciseParams({ id: 'm-empty', exercise: { name: 'Mostek' } });
    expect(result.sets).toBe(3);
    expect(result.restSets).toBe(60);
    expect(result.restReps).toBe(0);
    expect(result.preparationTime).toBe(5);
  });

  it('bierze przerwę z ćwiczenia, gdy mapping jej nie ma, i szanuje 0 z mappingu', () => {
    const exercise = { name: 'Mostek', defaultRestBetweenSets: 90, defaultRestBetweenReps: 2 };
    expect(resolveEffectiveExerciseParams({ id: 'm1', exercise }).restSets).toBe(90);
    expect(resolveEffectiveExerciseParams({ id: 'm2', restSets: 0, exercise }).restSets).toBe(0);
    expect(resolveEffectiveExerciseParams({ id: 'm3', exercise }).restReps).toBe(2);
  });

  it('zapisany REPS z executionTime > 0 zostaje powtórzeniowy', () => {
    const result = resolveEffectiveExerciseParams({
      id: 'm-reps',
      exercise: { name: 'Wspięcia', type: 'REPS', defaultExecutionTime: 3 },
    });
    expect(result.isTimeBased).toBe(false);
    expect(result.executionTime).toBe(3);
  });

  it('zapisany TIME z GraphQL (wielkie litery) jest czasowy', () => {
    const result = resolveEffectiveExerciseParams({
      id: 'm-time',
      exercise: { name: 'Deska', type: 'TIME', defaultDuration: 30 },
    });
    expect(result.isTimeBased).toBe(true);
  });

  it('normalizuje stronę z GraphQL i nadpisania', () => {
    expect(
      resolveEffectiveExerciseParams({ id: 'm-side', exercise: { name: 'Wykrok', side: 'ALTERNATING' } }).side
    ).toBe('alternating');
    expect(
      resolveEffectiveExerciseParams(
        { id: 'm-side', exercise: { name: 'Wykrok', side: 'BOTH' } },
        { exerciseSide: 'LEFT' }
      ).side
    ).toBe('left');
  });
});

describe('estimateEffectiveExerciseSeconds', () => {
  it('REPS nie liczy pozostałego duration jako czasu serii; TIME liczy', () => {
    const reps = resolveEffectiveExerciseParams({
      id: 'r',
      sets: 1,
      reps: 10,
      duration: 300,
      preparationTime: 0,
      exercise: { name: 'A', type: 'REPS' },
    });
    const time = resolveEffectiveExerciseParams({
      id: 't',
      sets: 1,
      reps: 1,
      duration: 300,
      preparationTime: 0,
      exercise: { name: 'B', type: 'TIME' },
    });
    // 10 powtórzeń × 3 s domyślnie
    expect(estimateEffectiveExerciseSeconds(reps)).toBe(30);
    expect(estimateEffectiveExerciseSeconds(time)).toBe(300);
  });
});
