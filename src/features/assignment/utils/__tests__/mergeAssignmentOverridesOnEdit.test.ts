import { describe, expect, it } from 'vitest';
import { mergeAssignmentOverridesOnEdit } from '../mergeAssignmentOverridesOnEdit';

describe('mergeAssignmentOverridesOnEdit', () => {
  it('keeps hidden/customImages while merging clinical delta', () => {
    const result = mergeAssignmentOverridesOnEdit({
      existingJson: JSON.stringify({
        'm-1': { sets: 5, hidden: true, customImages: ['a.png'], exerciseSide: 'left' },
        'm-2': { sets: 2 },
      }),
      clinicalByMappingId: {
        'm-1': { patientDescription: 'Nowy opis', exerciseSide: 'right' },
      },
      activeMappingIds: ['m-1'],
      mappingIdsWithWrittenDosage: ['m-1'],
    });

    const parsed = JSON.parse(result) as Record<string, Record<string, unknown>>;
    expect(parsed['m-2']).toBeUndefined();
    expect(parsed['m-1']).toMatchObject({
      hidden: true,
      customImages: ['a.png'],
      patientDescription: 'Nowy opis',
      exerciseSide: 'right',
    });
    expect(parsed['m-1'].sets).toBeUndefined();
  });

  it('strips shadowing dosage when mapping was written and clinical empty', () => {
    const result = mergeAssignmentOverridesOnEdit({
      existingJson: JSON.stringify({
        'm-1': { sets: 9, reps: 15, notes: 'x' },
      }),
      clinicalByMappingId: {},
      activeMappingIds: ['m-1'],
      mappingIdsWithWrittenDosage: ['m-1'],
    });

    expect(JSON.parse(result)).toEqual({});
  });

  it('returns empty object string when clearing all overrides', () => {
    const result = mergeAssignmentOverridesOnEdit({
      existingJson: JSON.stringify({ 'm-1': { sets: 3 } }),
      clinicalByMappingId: {},
      activeMappingIds: [],
      mappingIdsWithWrittenDosage: [],
    });
    expect(result).toBe('{}');
  });
});

describe('mergeAssignmentOverridesOnEdit: odpoczynek po ćwiczeniu', () => {
  const existingJson = JSON.stringify({ 'm-1': { restAfterExercise: 30, hidden: true } });

  it('wyczyszczony w kreatorze odpoczynek znika z nadpisania, reszta zostaje', () => {
    const result = mergeAssignmentOverridesOnEdit({
      existingJson,
      clinicalByMappingId: {},
      activeMappingIds: ['m-1'],
      mappingIdsWithWrittenDosage: ['m-1'],
    });
    expect(JSON.parse(result)).toEqual({ 'm-1': { hidden: true } });
  });

  it('nowa wartość z kreatora zastępuje poprzednią', () => {
    const result = mergeAssignmentOverridesOnEdit({
      existingJson,
      clinicalByMappingId: { 'm-1': { restAfterExercise: 0 } },
      activeMappingIds: ['m-1'],
      mappingIdsWithWrittenDosage: [],
    });
    expect(JSON.parse(result)).toEqual({ 'm-1': { restAfterExercise: 0, hidden: true } });
  });
});

describe('mergeAssignmentOverridesOnEdit: ćwiczenia dodatkowe z aplikacji', () => {
  it('keeps patient-only additional exercises added in the mobile app', () => {
    const additional = [{ id: 'add_1', exerciseId: 'ex-9', sets: 3, reps: 10 }];
    const result = mergeAssignmentOverridesOnEdit({
      existingJson: JSON.stringify({ 'm-1': { hidden: true }, __additionalExercises__: additional }),
      clinicalByMappingId: {},
      activeMappingIds: ['m-1'],
      mappingIdsWithWrittenDosage: [],
    });

    expect(JSON.parse(result)).toEqual({ 'm-1': { hidden: true }, __additionalExercises__: additional });
  });
});
