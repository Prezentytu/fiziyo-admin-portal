import { describe, expect, it } from 'vitest';

import {
  aiSuggestionParamDiffs,
  applyAiExecutionTimeSuggestion,
  aiSuggestionLoadKg,
  aiSuggestionSide,
  applyAiRepsSuggestion,
  applyAiSuggestionParams,
  positiveAiNumber,
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

describe('applyAiExecutionTimeSuggestion', () => {
  it('stores a time-based execution time as one repetition, like apply-all', () => {
    const prev = { ...wizardDefaults, duration: 20 };

    expect(applyAiExecutionTimeSuggestion(prev, 'time', 45)).toMatchObject({ reps: 1, executionTime: 45, duration: null });
    expect(applyAiExecutionTimeSuggestion(prev, 'time', Number.NaN)).toEqual(prev);
    expect(applyAiExecutionTimeSuggestion(prev, 'time', -5)).toEqual(prev);
  });

  it('keeps repetitions for a rep-based exercise', () => {
    expect(applyAiExecutionTimeSuggestion(wizardDefaults, 'reps', 3)).toEqual({ ...wizardDefaults, executionTime: 3 });
    expect(applyAiExecutionTimeSuggestion(wizardDefaults, 'reps', 0)).toEqual(wizardDefaults);
  });
});

describe('aiSuggestionParamDiffs', () => {
  const noAdvanced = { tempo: null, weight: null, rangeOfMotion: null, preparationTime: null, executionTime: null };

  it('does not count a duration card that is not rendered after the hold preset', () => {
    const diffs = aiSuggestionParamDiffs(
      {
        type: 'time',
        sets: 3,
        reps: null,
        duration: null,
        restSets: 30,
        advancedParams: { ...noAdvanced, executionTime: 30 },
      },
      { ...wizardDefaults, sets: 3, reps: 1, executionTime: 30, restSets: 30 }
    );

    expect(Object.values(diffs).some(Boolean)).toBe(false);
  });

  it('shows one time card when AI gives both duration and execution time for a time-based exercise', () => {
    const diffs = aiSuggestionParamDiffs(
      {
        type: 'time',
        sets: 2,
        reps: null,
        duration: 60,
        restSets: 60,
        advancedParams: { ...noAdvanced, executionTime: 45 },
      },
      wizardDefaults
    );

    expect(diffs).toMatchObject({ duration: false, executionTime: true, reps: true });
  });

  it('hides cards with empty or zero AI values, as apply-all ignores them', () => {
    const diffs = aiSuggestionParamDiffs(
      {
        type: 'reps',
        sets: 0,
        reps: null,
        duration: null,
        restSets: 0,
        advancedParams: { ...noAdvanced, preparationTime: 0, executionTime: 0 },
      },
      wizardDefaults
    );

    expect(diffs).toEqual({
      sets: false,
      reps: false,
      duration: false,
      executionTime: false,
      preparationTime: false,
      restSets: false,
    });
  });

  it('marks positive values that differ from the wizard', () => {
    const diffs = aiSuggestionParamDiffs(
      {
        type: 'reps',
        sets: 3,
        reps: 12,
        duration: null,
        restSets: 45,
        advancedParams: { ...noAdvanced, preparationTime: 10, executionTime: 3 },
      },
      wizardDefaults
    );

    expect(diffs).toEqual({
      sets: true,
      reps: true,
      duration: false,
      executionTime: true,
      preparationTime: true,
      restSets: true,
    });
  });
});

describe('positiveAiNumber', () => {
  it('rounds before the positivity check, so a fraction never becomes zero', () => {
    expect(positiveAiNumber(0.4)).toBeNull();
    expect(positiveAiNumber(2.6)).toBe(3);
  });
});

describe('AI parameters for a time-based exercise', () => {
  const noAdvanced = { tempo: null, weight: null, rangeOfMotion: null, preparationTime: null, executionTime: null };

  it('keeps the reps card when a time-based suggestion has no time, as apply-all writes the reps', () => {
    const suggestion = { type: 'time' as const, sets: 2, reps: 12, duration: null, restSets: 60, advancedParams: noAdvanced };

    expect(aiSuggestionParamDiffs(suggestion, wizardDefaults).reps).toBe(true);
    expect(applyAiSuggestionParams(wizardDefaults, suggestion).reps).toBe(12);
    expect(applyAiRepsSuggestion(wizardDefaults, suggestion)).toEqual(applyAiSuggestionParams(wizardDefaults, suggestion));
  });

  it('shows the reps card when the time matches but the wizard still has many reps', () => {
    const suggestion = { type: 'time' as const, sets: 2, reps: null, duration: 30, restSets: 60, advancedParams: null };
    const current = { ...wizardDefaults, executionTime: 30 };

    expect(aiSuggestionParamDiffs(suggestion, current)).toMatchObject({ reps: true, duration: false });
    expect(applyAiRepsSuggestion(current, suggestion)).toEqual(applyAiSuggestionParams(current, suggestion));
  });

  it('has no reps card once the exercise is one hold per set', () => {
    const suggestion = { type: 'time' as const, sets: 2, reps: null, duration: 30, restSets: 60, advancedParams: null };

    expect(aiSuggestionParamDiffs(suggestion, { ...wizardDefaults, reps: 1, executionTime: 30 }).reps).toBe(false);
  });
});

describe('aiSuggestionSide', () => {
  it('keeps the wizard side when AI proposes none, as the side card is hidden then', () => {
    expect(aiSuggestionSide('none', 'left')).toBe('left');
    expect(aiSuggestionSide('both', 'left')).toBe('both');
  });
});

describe('legacy duration from AI', () => {
  it('is never written for a rep-based suggestion, so a hold cannot be left half in duration', () => {
    const suggestion = { type: 'reps' as const, sets: 3, reps: 10, duration: 40, restSets: 60, advancedParams: null };

    expect(applyAiSuggestionParams(wizardDefaults, suggestion).duration).toBeNull();
    expect(aiSuggestionParamDiffs(suggestion, wizardDefaults).duration).toBe(false);
  });
});

describe('aiSuggestionLoadKg', () => {
  it('reads kilograms and gives null for a load without a number, so the field is not cleared', () => {
    expect(aiSuggestionLoadKg('20kg')).toBe(20);
    expect(aiSuggestionLoadKg('2,5 kg')).toBe(2.5);
    expect(aiSuggestionLoadKg('masa ciała')).toBeNull();
    expect(aiSuggestionLoadKg(null)).toBeNull();
  });
});
