import { describe, expect, it } from 'vitest';

import {
  buildAssignmentOverrideDeltasFromBuilder,
  remapOverrideDeltasToMappingIds,
  stringifyAssignmentOverrides,
} from '../buildAssignmentOverrideDeltas';

describe('buildAssignmentOverrideDeltasFromBuilder', () => {
  const exercises = [
    {
      id: 'e1',
      name: 'Przysiad',
      side: 'both',
      rangeOfMotion: 'pełny',
      difficultyLevel: 'MEDIUM',
      patientDescription: 'Opis',
      clinicalDescription: 'Kliniczny',
      audioCue: 'Cue',
      defaultSets: 3,
      defaultReps: 10,
    },
  ];

  it('returns empty when params match template clinical fields', () => {
    const deltas = buildAssignmentOverrideDeltasFromBuilder(
      [{ instanceId: 'i1', exerciseId: 'e1' }],
      new Map([
        [
          'i1',
          {
            sets: 5,
            exerciseSide: 'both',
            rangeOfMotion: 'pełny',
            difficultyLevel: 'MEDIUM',
            patientDescription: 'Opis',
            clinicalDescription: 'Kliniczny',
            audioCue: 'Cue',
          },
        ],
      ]),
      exercises
    );
    expect(deltas).toEqual({});
  });

  it('captures clinical deltas only (dosage stays on mapping)', () => {
    const deltas = buildAssignmentOverrideDeltasFromBuilder(
      [{ instanceId: 'i1', exerciseId: 'e1' }],
      new Map([
        [
          'i1',
          {
            sets: 8,
            exerciseSide: 'left',
            rangeOfMotion: '90°',
            difficultyLevel: 'HARD',
            patientDescription: 'Inny',
          },
        ],
      ]),
      exercises
    );
    expect(deltas.i1).toEqual({
      exerciseSide: 'left',
      rangeOfMotion: '90°',
      difficultyLevel: 'HARD',
      patientDescription: 'Inny',
    });
    expect(deltas.i1).not.toHaveProperty('sets');
  });

  it('remaps instance ids to mapping ids', () => {
    const remapped = remapOverrideDeltasToMappingIds(
      { i1: { exerciseSide: 'left' } },
      new Map([['i1', 'mapping-99']])
    );
    expect(remapped).toEqual({ 'mapping-99': { exerciseSide: 'left' } });
    expect(stringifyAssignmentOverrides(remapped)).toBe(
      JSON.stringify({ 'mapping-99': { exerciseSide: 'left' } })
    );
    expect(stringifyAssignmentOverrides({})).toBeNull();
  });
});
