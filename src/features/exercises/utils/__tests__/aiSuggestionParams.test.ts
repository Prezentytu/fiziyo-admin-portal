import { describe, expect, it } from 'vitest';

import {
  applyAiDurationSuggestion,
  applyAiSuggestionParams,
  currentAiDurationValue,
  type AiSuggestionParamsTarget,
} from '../aiSuggestionParams';

const wizardDefaults: AiSuggestionParamsTarget = {
  sets: 2,
  reps: 10,
  duration: null,
  restSets: 60,
  preparationTime: 5,
  executionTime: null,
};

describe('applyAiSuggestionParams', () => {
  it('maps a time-based suggestion to execution time like the hold preset', () => {
    const result = applyAiSuggestionParams(wizardDefaults, {
      type: 'time',
      sets: 3,
      reps: null,
      duration: 30,
      restSets: 30,
      advancedParams: null,
    });

    expect(result).toMatchObject({ sets: 3, reps: 1, executionTime: 30, duration: null, restSets: 30 });
  });

  it('keeps wizard values when the suggestion leaves fields empty or zero', () => {
    const result = applyAiSuggestionParams(wizardDefaults, {
      type: 'reps',
      sets: 0,
      reps: null,
      duration: null,
      restSets: 0,
      advancedParams: { tempo: null, weight: null, rangeOfMotion: null, preparationTime: null, executionTime: null },
    });

    expect(result).toEqual(wizardDefaults);
  });

  it('applies rep-based values and advanced timing from AI', () => {
    const result = applyAiSuggestionParams(wizardDefaults, {
      type: 'reps',
      sets: 3,
      reps: 12,
      duration: null,
      restSets: 45,
      advancedParams: { tempo: '2020', weight: null, rangeOfMotion: null, preparationTime: 10, executionTime: null },
    });

    expect(result).toMatchObject({ sets: 3, reps: 12, restSets: 45, preparationTime: 10, executionTime: null });
  });

  it('prefers the explicit execution time from advanced params for a time-based exercise', () => {
    const result = applyAiSuggestionParams(wizardDefaults, {
      type: 'time',
      sets: 2,
      reps: null,
      duration: 60,
      restSets: 30,
      advancedParams: { tempo: null, weight: null, rangeOfMotion: null, preparationTime: null, executionTime: 45 },
    });

    expect(result).toMatchObject({ reps: 1, executionTime: 45, duration: null });
  });
});

describe('applyAiDurationSuggestion', () => {
  it('stores a time-based duration as execution time', () => {
    expect(applyAiDurationSuggestion(wizardDefaults, 'time', 40)).toMatchObject({
      reps: 1,
      executionTime: 40,
      duration: null,
    });
  });

  it('ignores empty or invalid seconds', () => {
    expect(applyAiDurationSuggestion(wizardDefaults, 'time', Number.NaN)).toEqual(wizardDefaults);
    expect(applyAiDurationSuggestion(wizardDefaults, 'time', -5)).toEqual(wizardDefaults);
  });

  it('compares the card with execution time for a time-based suggestion', () => {
    const current = { duration: null, executionTime: 30 };

    expect(currentAiDurationValue(current, 'time')).toBe(30);
    expect(currentAiDurationValue(current, 'reps')).toBeNull();
  });
});
