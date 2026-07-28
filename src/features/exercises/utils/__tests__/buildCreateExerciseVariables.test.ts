import { describe, expect, it } from 'vitest';

import { buildCreateExerciseVariables } from '../buildCreateExerciseVariables';
import { inferExerciseType } from '../inferExerciseType';

describe('inferExerciseType', () => {
  it('returns time when executionTime > 0', () => {
    expect(inferExerciseType(30)).toBe('time');
  });

  it('returns reps when executionTime is null or zero', () => {
    expect(inferExerciseType(null)).toBe('reps');
    expect(inferExerciseType(0)).toBe('reps');
    expect(inferExerciseType(undefined)).toBe('reps');
  });
});

describe('buildCreateExerciseVariables', () => {
  it('maps full draft to create payload including pro tuning and load dual-write', () => {
    const result = buildCreateExerciseVariables({
      organizationId: 'org-1',
      draft: {
        name: '  Przysiad  ',
        patientDescription: 'Opis dla pacjenta',
        clinicalDescription: 'Opis kliniczny',
        notes: 'Notatki wewnętrzne',
        audioCue: 'Proste plecy',
        tempo: '3010',
        rangeOfMotion: 'Pełny zakres',
        side: 'both',
        difficultyLevel: 'MEDIUM',
        videoUrl: 'https://example.com/v.mp4',
        sets: 3,
        reps: 10,
        executionTime: 4,
        restSets: 60,
        restReps: 2,
        preparationTime: 5,
        duration: null,
        loadKg: 12.5,
        mainTags: ['tag-a'],
        additionalTags: ['tag-b'],
      },
    });

    expect(result).toMatchObject({
      organizationId: 'org-1',
      scope: 'ORGANIZATION',
      name: 'Przysiad',
      description: 'Opis dla pacjenta',
      type: 'time',
      sets: 3,
      reps: 10,
      executionTime: 4,
      restSets: 60,
      restReps: 2,
      preparationTime: 5,
      duration: null,
      exerciseSide: 'both',
      tempo: '3010',
      clinicalDescription: 'Opis kliniczny',
      audioCue: 'Proste plecy',
      difficultyLevel: 'MEDIUM',
      rangeOfMotion: 'Pełny zakres',
      notes: 'Notatki wewnętrzne',
      videoUrl: 'https://example.com/v.mp4',
      isActive: true,
      mainTags: ['tag-a'],
      additionalTags: ['tag-b'],
      loadWeightKg: 12.5,
      loadSource: 'manual',
      loadType: 'weight',
      loadValue: 12.5,
      loadUnit: 'kg',
      loadText: '12.5 kg',
    });
  });

  it('maps none / UNKNOWN / empty strings to null and clears load', () => {
    const result = buildCreateExerciseVariables({
      organizationId: 'org-1',
      draft: {
        name: 'Plank',
        description: '  ',
        clinicalDescription: '   ',
        notes: '',
        audioCue: '',
        tempo: '',
        rangeOfMotion: '',
        exerciseSide: 'none',
        difficultyLevel: 'UNKNOWN',
        videoUrl: '',
        sets: 3,
        reps: 1,
        executionTime: null,
        loadKg: null,
        mainTags: [],
        additionalTags: null,
      },
    });

    expect(result.type).toBe('reps');
    expect(result.description).toBe('');
    expect(result.exerciseSide).toBeNull();
    expect(result.difficultyLevel).toBeNull();
    expect(result.clinicalDescription).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.audioCue).toBeNull();
    expect(result.tempo).toBeNull();
    expect(result.rangeOfMotion).toBeNull();
    expect(result.videoUrl).toBeNull();
    expect(result.mainTags).toBeNull();
    expect(result.additionalTags).toBeNull();
    expect(result.loadWeightKg).toBeNull();
    expect(result.loadSource).toBeNull();
    expect(result.loadType).toBeNull();
    expect(result.loadValue).toBeNull();
    expect(result.loadUnit).toBeNull();
    expect(result.loadText).toBeNull();
  });

  it('ignores non-positive loadKg', () => {
    const result = buildCreateExerciseVariables({
      organizationId: 'org-1',
      draft: {
        name: 'Test',
        loadKg: 0,
      },
    });

    expect(result.loadWeightKg).toBeNull();
    expect(result.loadText).toBeNull();
  });

  it('accepts images and custom scope', () => {
    const result = buildCreateExerciseVariables({
      organizationId: 'org-1',
      scope: 'PERSONAL',
      isActive: false,
      draft: {
        name: 'Kopia',
        images: ['https://cdn/a.jpg'],
        difficultyLevel: 'hard',
      },
    });

    expect(result.scope).toBe('PERSONAL');
    expect(result.isActive).toBe(false);
    expect(result.images).toEqual(['https://cdn/a.jpg']);
    expect(result.difficultyLevel).toBe('HARD');
  });
});
