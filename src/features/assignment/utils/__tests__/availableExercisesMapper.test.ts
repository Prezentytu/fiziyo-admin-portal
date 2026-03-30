import { describe, expect, it } from 'vitest';
import { mapAvailableExercises } from '../availableExercisesMapper';

describe('mapAvailableExercises', () => {
  it('prefers structured defaultLoad from API response', () => {
    const mapped = mapAvailableExercises([
      {
        id: 'exercise-1',
        name: 'Przysiad',
        isActive: true,
        defaultLoad: {
          type: 'band',
          value: 3,
          unit: 'level',
          text: 'Guma poziom 3',
        },
        loadType: 'weight',
        loadValue: 20,
        loadUnit: 'kg',
        loadText: '20 kg',
      },
    ]);

    expect(mapped).toHaveLength(1);
    expect(mapped[0].defaultLoad).toEqual({
      type: 'band',
      value: 3,
      unit: 'level',
      text: 'Guma poziom 3',
    });
  });

  it('falls back to legacy load scalar fields when defaultLoad is missing', () => {
    const mapped = mapAvailableExercises([
      {
        id: 'exercise-2',
        name: 'Wyciskanie',
        isActive: true,
        loadType: 'weight',
        loadValue: 15,
        loadUnit: 'kg',
        loadText: '15 kg',
      },
    ]);

    expect(mapped[0].defaultLoad).toEqual({
      type: 'weight',
      value: 15,
      unit: 'kg',
      text: '15 kg',
    });
  });

  it('filters out inactive exercises', () => {
    const mapped = mapAvailableExercises([
      { id: 'exercise-1', name: 'Aktywne', isActive: true },
      { id: 'exercise-2', name: 'Nieaktywne', isActive: false },
    ]);

    expect(mapped).toHaveLength(1);
    expect(mapped[0].id).toBe('exercise-1');
  });
});
