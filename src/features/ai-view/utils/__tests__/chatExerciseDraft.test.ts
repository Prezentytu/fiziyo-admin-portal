import { describe, expect, it } from 'vitest';

import {
  buildChatExerciseEnrichment,
  CHAT_EXERCISE_DEFAULTS,
  itemsToLines,
  linesToItems,
  paramsFromSuggestion,
} from '../chatExerciseDraft';

const SUGGESTION = {
  type: 'reps' as const,
  sets: 4,
  reps: 12,
  duration: null,
  restSets: 45,
  advancedParams: { tempo: '3010', weight: null, rangeOfMotion: null, preparationTime: 10, executionTime: 4 },
};

describe('paramsFromSuggestion', () => {
  it('fills the full parameter set from the AI proposal, rest between reps from the defaults', () => {
    expect(paramsFromSuggestion(SUGGESTION)).toEqual({
      type: 'reps',
      sets: 4,
      reps: 12,
      executionTime: 4,
      restSets: 45,
      restReps: CHAT_EXERCISE_DEFAULTS.restReps,
      preparationTime: 10,
    });
  });

  it('turns a hold into one repetition of the hold time', () => {
    const params = paramsFromSuggestion({
      ...SUGGESTION,
      type: 'time',
      reps: null,
      duration: 30,
      advancedParams: null,
    });

    expect(params).toMatchObject({ type: 'time', reps: 1, executionTime: 30 });
  });

  it('keeps defaults where the AI gave nothing usable', () => {
    const params = paramsFromSuggestion({ ...SUGGESTION, sets: 0, restSets: Number.NaN, advancedParams: null });

    expect(params.sets).toBe(CHAT_EXERCISE_DEFAULTS.sets);
    expect(params.restSets).toBe(CHAT_EXERCISE_DEFAULTS.restSets);
    expect(params.preparationTime).toBe(CHAT_EXERCISE_DEFAULTS.preparationTime);
  });
});

describe('steps and cues as lines', () => {
  it('splits one step per line and drops numbering and bullets', () => {
    expect(linesToItems('1. Stań prosto\n\n2) Ugnij kolana\n- Wróć powoli')).toEqual([
      'Stań prosto',
      'Ugnij kolana',
      'Wróć powoli',
    ]);
    expect(itemsToLines([' Stań prosto ', '', 'Ugnij kolana'])).toBe('Stań prosto\nUgnij kolana');
  });
});

describe('buildChatExerciseEnrichment', () => {
  it('saves the edited steps and cues over the AI proposal and keeps the rest of it', () => {
    const enrichment = buildChatExerciseEnrichment(
      {
        $schema: 'fiziyo-exercise-v3',
        patient: { steps: ['AI krok'], cues: ['AI wskazówka'], why: 'Wzmacnia kolano' },
        therapist: { indications: ['ACL'] },
      },
      'Stań prosto\nUgnij kolana',
      'Kolano nad stopą'
    );

    expect(enrichment).toEqual({
      $schema: 'fiziyo-exercise-v3',
      patient: { why: 'Wzmacnia kolano', steps: ['Stań prosto', 'Ugnij kolana'], cues: ['Kolano nad stopą'] },
      therapist: { indications: ['ACL'] },
    });
  });

  it('saves nothing when there is no proposal and the fields are empty', () => {
    expect(buildChatExerciseEnrichment(null, ' \n', '')).toBeNull();
  });

  it('marks hand-written steps as v3', () => {
    expect(buildChatExerciseEnrichment(null, 'Stań prosto', '')).toEqual({
      $schema: 'fiziyo-exercise-v3',
      patient: { steps: ['Stań prosto'] },
    });
  });
});
