import { describe, expect, it } from 'vitest';

import {
  buildChatExerciseEnrichment,
  CHAT_EXERCISE_DEFAULTS,
  itemsToLines,
  filmLink,
  formatChatParams,
  linesToItems,
  linesToMistakes,
  textsFromEnrichment,
  youtubeSearchUrl,
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
  it('saves only what the card shows: steps, cues, mistakes and when to stop', () => {
    expect(
      buildChatExerciseEnrichment({
        steps: '1. Stań prosto\nUgnij kolana',
        cues: 'Kolano nad stopą',
        mistakes: 'Kolano ucieka do środka → prowadź je nad stopą\nWstrzymany oddech',
        stopIf: 'Ostry ból kolana',
      })
    ).toEqual({
      $schema: 'fiziyo-exercise-v3',
      patient: {
        steps: ['Stań prosto', 'Ugnij kolana'],
        cues: ['Kolano nad stopą'],
        mistakes: [
          { mistake: 'Kolano ucieka do środka', fix: 'prowadź je nad stopą' },
          { mistake: 'Wstrzymany oddech' },
        ],
      },
      safety: { stop_if: 'Ostry ból kolana' },
    });
  });

  it('saves nothing when the fields are empty', () => {
    expect(buildChatExerciseEnrichment({ steps: ' \n', cues: '', mistakes: '', stopIf: ' ' })).toBeNull();
  });
});

describe('textsFromEnrichment', () => {
  it('reads each card section from a v3 document and round-trips mistakes', () => {
    const texts = textsFromEnrichment({
      $schema: 'fiziyo-exercise-v3',
      patient: {
        summary: 'Trzymasz sztangę nad głową.',
        steps: ['Stań', 'Wypchnij sztangę'],
        cues: ['Żebra w dół'],
        mistakes: [{ mistake: 'Wyginanie lędźwi', fix: 'napnij brzuch' }],
      },
      safety: { stop_if: 'Ból barku' },
    });
    expect(texts).toEqual({
      description: 'Trzymasz sztangę nad głową.',
      steps: 'Stań\nWypchnij sztangę',
      cues: 'Żebra w dół',
      mistakes: 'Wyginanie lędźwi → napnij brzuch',
      stopIf: 'Ból barku',
    });
    expect(linesToMistakes(texts.mistakes)).toEqual([{ mistake: 'Wyginanie lędźwi', fix: 'napnij brzuch' }]);
  });

  it('gives empty texts without a document', () => {
    expect(textsFromEnrichment(null)).toEqual({ description: '', steps: '', cues: '', mistakes: '', stopIf: '' });
  });
});

describe('formatChatParams', () => {
  const base = {
    side: 'none' as const,
    sets: 3,
    reps: 10,
    executionTime: 0,
    restSets: 60,
    restReps: 0,
    preparationTime: 5,
  };

  it('shows a hold as sets × seconds', () => {
    expect(formatChatParams({ ...base, reps: 1, executionTime: 30, restSets: 30 }, 'time')).toBe(
      '3 × 30 s · przerwa 30 s · przygotowanie 5 s'
    );
  });

  it('shows reps with the repetition time and the side', () => {
    expect(formatChatParams({ ...base, executionTime: 3, side: 'both' }, 'reps')).toBe(
      '3 × 10 · 3 s powtórzenie · przerwa 60 s · przygotowanie 5 s · na każdą stronę'
    );
  });
});

describe('film link', () => {
  it('searches YouTube for the exercise name', () => {
    expect(youtubeSearchUrl(' Mostek z hantlem ')).toBe(
      'https://www.youtube.com/results?search_query=Mostek%20z%20hantlem'
    );
  });

  it('keeps only http(s) links', () => {
    expect(filmLink(' https://youtu.be/abc ')).toBe('https://youtu.be/abc');
    expect(filmLink('youtube mostek')).toBeNull();
    expect(filmLink('javascript:alert(1)')).toBeNull();
    expect(filmLink('')).toBeNull();
  });
});
