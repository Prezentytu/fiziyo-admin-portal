import { describe, expect, it } from 'vitest';
import {
  buildMappingOverridesJson,
  mergeOverrideLayers,
  parseMappingOverridesJson,
} from '../mappingOverrides';

describe('mappingOverrides', () => {
  it('parseMappingOverridesJson filtruje do kanonicznych kluczy', () => {
    const parsed = parseMappingOverridesJson(
      JSON.stringify({
        exerciseSide: 'left',
        rangeOfMotion: '90',
        sets: 5,
        unknown: 'x',
      })
    );
    expect(parsed).toEqual({ exerciseSide: 'left', rangeOfMotion: '90' });
  });

  it('buildMappingOverridesJson zwraca null gdy brak delty vs szablon', () => {
    expect(
      buildMappingOverridesJson(
        { exerciseSide: 'both', difficultyLevel: 'MEDIUM' },
        { side: 'both', difficultyLevel: 'MEDIUM' }
      )
    ).toBeNull();
  });

  it('buildMappingOverridesJson zapisuje tylko zmienione pola override', () => {
    const json = buildMappingOverridesJson(
      {
        exerciseSide: 'both',
        rangeOfMotion: 'pełny',
        difficultyLevel: 'MEDIUM',
        patientDescription: 'A',
      },
      {
        side: 'left',
        rangeOfMotion: 'pełny',
        difficultyLevel: 'HARD',
        patientDescription: 'A',
      }
    );
    expect(JSON.parse(json ?? '{}')).toEqual({
      exerciseSide: 'left',
      difficultyLevel: 'HARD',
    });
  });

  it('mergeOverrideLayers: assignment wygrywa z mapping', () => {
    const merged = mergeOverrideLayers(
      { exerciseSide: 'left', rangeOfMotion: '90' },
      { exerciseSide: 'right', audioCue: 'cue' }
    );
    expect(merged).toEqual({
      exerciseSide: 'right',
      rangeOfMotion: '90',
      audioCue: 'cue',
    });
  });

  it('parseMappingOverridesJson zachowuje enrichment z whitelist', () => {
    const parsed = parseMappingOverridesJson(
      JSON.stringify({
        exerciseSide: 'left',
        enrichment: {
          patient: { steps: ['Krok'] },
          therapist: { clinical_notes: 'ignore' },
        },
      })
    );
    expect(parsed).toEqual({
      exerciseSide: 'left',
      enrichment: { patient: { steps: ['Krok'] } },
    });
  });

  it('mergeOverrideLayers scala enrichment per-path', () => {
    const merged = mergeOverrideLayers(
      {
        enrichment: { patient: { steps: ['M'], cues: ['C'] } },
      },
      {
        enrichment: { patient: { steps: ['A'] }, safety: { stop_if: 'S' } },
      }
    );
    expect(merged?.enrichment).toEqual({
      patient: { steps: ['A'], cues: ['C'] },
      safety: { stop_if: 'S' },
    });
  });

  it('buildMappingOverridesJson dołącza enrichmentDelta', () => {
    const json = buildMappingOverridesJson(
      { exerciseSide: 'both' },
      { side: 'both' },
      { patient: { steps: ['X'] } }
    );
    expect(JSON.parse(json ?? '{}')).toEqual({
      enrichment: { patient: { steps: ['X'] } },
    });
  });
});
