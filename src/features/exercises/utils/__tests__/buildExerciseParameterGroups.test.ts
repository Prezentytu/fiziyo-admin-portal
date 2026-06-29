import { describe, it, expect } from 'vitest';
import { buildExerciseParameterGroups } from '../buildExerciseParameterGroups';
import type { ExerciseFieldValueSource } from '@/components/shared/exercise/displayRegistry';
import { EMPTY_NUMERIC_VALUE, EMPTY_TEXT_VALUE } from '@/components/shared/exercise/displayRegistry';

describe('buildExerciseParameterGroups', () => {
  const fullSource: ExerciseFieldValueSource = {
    sets: 3,
    reps: 10,
    duration: 30,
    executionTime: 5,
    restSets: 60,
    restReps: 0,
    preparationTime: 10,
    tempo: '3-1-2-0',
    loadDisplayText: '5 kg',
    side: 'both',
    rangeOfMotion: '90°',
    difficultyLevel: 'MEDIUM',
  };

  it('returns 4 groups', () => {
    const groups = buildExerciseParameterGroups(fullSource);
    expect(groups).toHaveLength(4);
    expect(groups.map((g) => g.id)).toEqual(['dosage', 'timing', 'position', 'classification']);
  });

  it('dosage group has 4 items: sets, reps, duration, executionTime', () => {
    const [dosage] = buildExerciseParameterGroups(fullSource);
    expect(dosage.items.map((i) => i.key)).toEqual(['sets', 'reps', 'duration', 'executionTime']);
  });

  it('renders correct values when fields are set', () => {
    const [dosage] = buildExerciseParameterGroups(fullSource);
    const setsItem = dosage.items.find((i) => i.key === 'sets')!;
    expect(setsItem.value).toBe('3');
    expect(setsItem.isEmpty).toBe(false);

    const execItem = dosage.items.find((i) => i.key === 'executionTime')!;
    expect(execItem.value).toBe('5s');
    expect(execItem.isEmpty).toBe(false);
  });

  it('executionTime always present even when undefined', () => {
    const emptySource: ExerciseFieldValueSource = {};
    const groups = buildExerciseParameterGroups(emptySource);
    const dosage = groups.find((g) => g.id === 'dosage')!;
    const execItem = dosage.items.find((i) => i.key === 'executionTime')!;
    expect(execItem).toBeDefined();
    expect(execItem.isEmpty).toBe(true);
    expect(execItem.value).toBe(EMPTY_NUMERIC_VALUE);
  });

  it('text-type fields use EMPTY_TEXT_VALUE when missing', () => {
    const emptySource: ExerciseFieldValueSource = {};
    const groups = buildExerciseParameterGroups(emptySource);
    const positionGroup = groups.find((g) => g.id === 'position')!;
    const sideItem = positionGroup.items.find((i) => i.key === 'side')!;
    expect(sideItem.isEmpty).toBe(true);
    expect(sideItem.value).toBe(EMPTY_TEXT_VALUE);
  });

  it('exposes label and tooltip from EXERCISE_FIELD_METADATA', () => {
    const groups = buildExerciseParameterGroups(fullSource);
    const timing = groups.find((g) => g.id === 'timing')!;
    const tempoItem = timing.items.find((i) => i.key === 'tempo')!;
    expect(tempoItem.label).toBeTruthy();
    expect(tempoItem.tooltip).toBeTruthy();
  });

  it('classificationGroup contains difficultyLevel', () => {
    const groups = buildExerciseParameterGroups(fullSource);
    const classification = groups.find((g) => g.id === 'classification')!;
    expect(classification.items.map((i) => i.key)).toContain('difficultyLevel');
    const diffItem = classification.items.find((i) => i.key === 'difficultyLevel')!;
    expect(diffItem.isEmpty).toBe(false);
  });
});
