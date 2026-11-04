import { describe, expect, it } from 'vitest';

import {
  buildChatExerciseEnrichment,
  CHAT_EXERCISE_DEFAULTS,
  itemsToLines,
  linesToItems,
  paramsFromSuggestion,
  resolveChatExerciseType,
} from '../chatExerciseDraft';

const SUGGESTION = {
  type: 'reps' as const,
  exerciseSide: 'both' as const,
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
      side: 'both',
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

describe('resolveChatExerciseType', () => {
  it('saves a time exercise without a hold time as reps, so the player can start it', () => {
    expect(resolveChatExerciseType('time', 0)).toBe('reps');
    expect(resolveChatExerciseType('time', 30)).toBe('time');
    expect(resolveChatExerciseType('reps', 30)).toBe('reps');
  });

  it('does not propose a time exercise when the AI gave no hold time', () => {
    const params = paramsFromSuggestion({ ...SUGGESTION, type: 'time', duration: null, advancedParams: null });

    expect(params.type).toBe('reps');
  });
});

describe('buildChatExerciseEnrichment', () => {
  it('saves only the steps and cues shown in the card', () => {
    expect(buildChatExerciseEnrichment('1. Stań prosto\nUgnij kolana', 'Kolano nad stopą')).toEqual({
      $schema: 'fiziyo-exercise-v3',
      patient: { steps: ['Stań prosto', 'Ugnij kolana'], cues: ['Kolano nad stopą'] },
    });
  });

  it('saves nothing when the fields are empty', () => {
    expect(buildChatExerciseEnrichment(' \n', '')).toBeNull();
  });
});
