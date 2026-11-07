import { describe, expect, it } from 'vitest';

import type { ExerciseSuggestionResponse } from '@/types/ai.types';
import { ENRICHMENT_SCHEMA_V3 } from '@/features/verification/utils/enrichmentToV3';
import {
  aiVariantAttributes,
  buildAiFullExerciseDraft,
  matchAiSuggestedTagIds,
  mergeAiEnrichment,
  revertAiFill,
  normalizeAiExerciseVariants,
  sanitizeAiSuggestion,
  type AiFullExerciseTarget,
} from '../aiFullExercise';

const wizardDefaults: AiFullExerciseTarget = {
  name: 'pośladek guma',
  description: '',
  exerciseSide: 'none',
  difficultyLevel: 'UNKNOWN',
  sets: 2,
  reps: 10,
  restSets: 60,
  preparationTime: 5,
  executionTime: null,
  tempo: '',
  loadKg: null,
  rangeOfMotion: '',
};

function suggestion(overrides: Partial<ExerciseSuggestionResponse> = {}): ExerciseSuggestionResponse {
  return {
    description: 'Połóż się na boku. Unieś kolano, nie obracając miednicy.',
    type: 'reps',
    sets: 3,
    reps: 12,
    duration: null,
    restSets: 45,
    exerciseSide: 'both',
    suggestedTags: ['Pośladki', 'Guma oporowa'],
    confidence: 0.9,
    correctedName: null,
    nameCorrection: null,
    corrections: { naming: [], content: [], parameters: [] },
    warnings: [],
    similarInDatabase: null,
    advancedParams: {
      tempo: '2-0-1-0',
      weight: null,
      rangeOfMotion: 'Pełny zakres',
      preparationTime: 5,
      executionTime: null,
    },
    ...overrides,
  };
}

describe('normalizeAiExerciseVariants', () => {
  it('drops empty, duplicate and over-long names and normalizes side and level', () => {
    const variants = normalizeAiExerciseVariants({
      variants: [
        {
          name: 'Clamshell z gumą oporową.',
          position: 'leżenie bokiem',
          equipment: 'guma oporowa',
          side: 'both',
          level: 'easy',
        },
        { name: 'clamshell z gumą oporową', side: 'both' },
        { name: ' ' },
        { name: 'x'.repeat(201) },
        { name: 'Odwodzenie biodra w staniu', position: 'null', equipment: null, side: 'sideways', level: 'galaxy' },
        'not an object',
      ],
    });

    expect(variants).toEqual([
      {
        name: 'Clamshell z gumą oporową',
        position: 'leżenie bokiem',
        equipment: 'guma oporowa',
        side: 'both',
        level: 'easy',
      },
      { name: 'Odwodzenie biodra w staniu', position: null, equipment: null, side: 'none', level: 'unknown' },
    ]);
  });

  it('returns an empty list for a malformed response and caps the list at six', () => {
    expect(normalizeAiExerciseVariants(null)).toEqual([]);
    expect(normalizeAiExerciseVariants({ variants: 'oops' })).toEqual([]);
    const many = normalizeAiExerciseVariants({
      variants: Array.from({ length: 9 }, (_, i) => ({ name: `Wariant ${i}` })),
    });
    expect(many).toHaveLength(6);
  });

  it('lists only known variant attributes', () => {
    expect(
      aiVariantAttributes({ name: 'A', position: 'stanie', equipment: null, side: 'both', level: 'medium' })
    ).toEqual(['stanie', 'Na każdą stronę', 'Średni']);
  });
});

describe('sanitizeAiSuggestion', () => {
  it('treats absurd numbers and malformed tempo as missing', () => {
    const result = sanitizeAiSuggestion(
      suggestion({
        sets: 40,
        reps: 500,
        restSets: -10,
        advancedParams: { tempo: 'szybko', weight: '5', rangeOfMotion: ' ', preparationTime: 600, executionTime: 0 },
      })
    );

    expect(result.sets).toBe(0);
    expect(result.reps).toBeNull();
    expect(result.restSets).toBe(0);
    expect(result.advancedParams).toMatchObject({
      tempo: null,
      rangeOfMotion: null,
      preparationTime: null,
      executionTime: null,
    });
  });
});

describe('buildAiFullExerciseDraft', () => {
  it('fills the whole exercise from the chosen variant and suggestion at once', () => {
    const { next, filled } = buildAiFullExerciseDraft(wizardDefaults, {
      defaults: wizardDefaults,
      suggestion: suggestion({
        advancedParams: {
          tempo: '2-0-1-0',
          weight: '2,5 kg',
          rangeOfMotion: 'Pełny zakres',
          preparationTime: 5,
          executionTime: null,
        },
      }),
      variant: {
        name: 'Clamshell z gumą oporową',
        position: 'leżenie bokiem',
        equipment: 'guma oporowa',
        side: 'both',
        level: 'easy',
      },
    });

    expect(next).toEqual({
      name: 'Clamshell z gumą oporową',
      description: 'Połóż się na boku. Unieś kolano, nie obracając miednicy.',
      exerciseSide: 'both',
      difficultyLevel: 'EASY',
      sets: 3,
      reps: 12,
      restSets: 45,
      preparationTime: 5,
      executionTime: null,
      tempo: '2010',
      loadKg: 2.5,
      rangeOfMotion: 'Pełny zakres',
    });
    expect(filled).toEqual([
      'nazwa',
      'opis',
      'podstawowe parametry',
      'strona ciała',
      'poziom trudności',
      'tempo',
      'obciążenie',
      'zakres ruchu',
    ]);
  });

  it('keeps the therapist description and range of motion and ignores absurd parameters', () => {
    const prev = { ...wizardDefaults, description: 'Mój opis', rangeOfMotion: '0-45°' };

    const { next, filled } = buildAiFullExerciseDraft(prev, {
      defaults: wizardDefaults,
      suggestion: suggestion({ sets: 99, reps: 0, restSets: 9999, exerciseSide: 'none', advancedParams: null }),
    });

    expect(next.description).toBe('Mój opis');
    expect(next.rangeOfMotion).toBe('0-45°');
    expect(next).toMatchObject({ sets: 2, reps: 10, restSets: 60, exerciseSide: 'none' });
    expect(filled).toEqual([]);
  });

  it('maps a time-based suggestion to execution time with one rep, like the hold preset', () => {
    const { next } = buildAiFullExerciseDraft(wizardDefaults, {
      defaults: wizardDefaults,
      suggestion: suggestion({ type: 'time', reps: null, duration: 30, sets: 3 }),
    });

    expect(next).toMatchObject({ sets: 3, reps: 1, executionTime: 30 });
  });

  it('uses the AI name correction when no variant was chosen', () => {
    const { next } = buildAiFullExerciseDraft(
      { ...wizardDefaults, name: 'hip trust' },
      {
        defaults: wizardDefaults,
        suggestion: suggestion({ correctedName: 'Hip Thrust' }),
      }
    );

    expect(next.name).toBe('Hip Thrust');
  });
});

describe('buildAiFullExerciseDraft keeps therapist values', () => {
  it('fills only fields that still have the wizard default', () => {
    const prev: AiFullExerciseTarget = {
      ...wizardDefaults,
      sets: 4,
      restSets: 90,
      tempo: '3010',
      loadKg: 5,
      exerciseSide: 'left',
      difficultyLevel: 'HARD',
    };

    const { next, filled } = buildAiFullExerciseDraft(prev, {
      defaults: wizardDefaults,
      suggestion: suggestion({
        advancedParams: { tempo: '2010', weight: '2', rangeOfMotion: null, preparationTime: 8, executionTime: null },
      }),
      variant: { name: 'Clamshell z gumą', position: null, equipment: null, side: 'both', level: 'easy' },
    });

    expect(next).toMatchObject({
      sets: 4,
      restSets: 90,
      tempo: '3010',
      loadKg: 5,
      exerciseSide: 'left',
      difficultyLevel: 'HARD',
      reps: 12,
      preparationTime: 8,
    });
    expect(filled).not.toContain('tempo');
    expect(filled).not.toContain('strona ciała');
  });

  it('changes reps and execution time only together and only when both are defaults', () => {
    const { next } = buildAiFullExerciseDraft(
      { ...wizardDefaults, reps: 8 },
      { defaults: wizardDefaults, suggestion: suggestion({ type: 'time', reps: null, duration: 30 }) }
    );

    expect(next).toMatchObject({ reps: 8, executionTime: null });
  });
});

describe('revertAiFill', () => {
  it('reverts AI values but keeps fields edited after the fill', () => {
    const before = { ...wizardDefaults };
    const after = { ...wizardDefaults, sets: 3, reps: 12, description: 'Opis AI', tempo: '2010' };
    const current = { ...after, reps: 15, description: 'Mój opis' };

    expect(revertAiFill(current, before, after)).toEqual({
      ...wizardDefaults,
      reps: 15,
      description: 'Mój opis',
    });
  });

  it('keeps manual edits inside the enrichment draft', () => {
    const before = { patient: { cues: ['Moja wskazówka'] } };
    const after = { patient: { cues: ['Moja wskazówka'], steps: ['AI krok'], mistakes: [{ mistake: 'AI' }] } };
    const current = { patient: { cues: ['Moja wskazówka'], steps: ['Mój krok'], mistakes: [{ mistake: 'AI' }] } };

    expect(revertAiFill(current, before, after)).toEqual({
      patient: { cues: ['Moja wskazówka'], steps: ['Mój krok'] },
    });
  });
});

describe('matchAiSuggestedTagIds', () => {
  it('matches organization tags ignoring Polish diacritics and keeps the limit', () => {
    const tags = [
      { id: 't1', name: 'Pośladki' },
      { id: 't2', name: 'Guma oporowa' },
      { id: 't3', name: 'Bark' },
    ];

    expect(matchAiSuggestedTagIds(['posladki', 'guma'], tags, [])).toEqual(['t1', 't2']);
    expect(matchAiSuggestedTagIds(['Pośladki', 'Guma oporowa'], tags, ['a', 'b'])).toEqual(['a', 'b', 't1']);
    expect(matchAiSuggestedTagIds(null, tags, ['a'])).toEqual(['a']);
  });

  it('never drops the therapist own tags', () => {
    const tags = [{ id: 't1', name: 'Pośladki' }];

    expect(matchAiSuggestedTagIds(['Pośladki'], tags, ['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
    expect(matchAiSuggestedTagIds(['Pośladki'], tags, ['t1'])).toEqual(['t1']);
  });
});

describe('mergeAiEnrichment', () => {
  it('fills empty sections only and reports steps, cues and mistakes', () => {
    const current = {
      $schema: ENRICHMENT_SCHEMA_V3,
      patient: { cues: ['Kolano nad stopą'] },
    };

    const { next, filled } = mergeAiEnrichment(current, {
      $schema: ENRICHMENT_SCHEMA_V3,
      patient: {
        steps: ['Połóż się na boku.', 'Unieś kolano.'],
        cues: ['Inna wskazówka AI'],
        mistakes: [{ mistake: 'Rotacja miednicy', fix: 'Dociśnij biodro' }],
        should_feel: 'Pracę pośladka',
      },
    });

    expect(next.patient?.cues).toEqual(['Kolano nad stopą']);
    expect(next.patient?.steps).toHaveLength(2);
    expect(filled).toEqual(['kroki wykonania', 'typowe błędy']);
  });

  it('leaves the draft untouched without AI data', () => {
    const current = { $schema: ENRICHMENT_SCHEMA_V3 };
    expect(mergeAiEnrichment(current, null)).toEqual({ next: current, filled: [] });
  });
});
