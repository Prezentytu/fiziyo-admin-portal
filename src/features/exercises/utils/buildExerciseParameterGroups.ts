import {
  EXERCISE_FIELD_METADATA,
  EMPTY_NUMERIC_VALUE,
  EMPTY_TEXT_VALUE,
} from '@/components/shared/exercise/displayRegistry';
import type { ExerciseFieldKey, ExerciseFieldValueSource } from '@/components/shared/exercise/displayRegistry';

export interface ExerciseParameterItem {
  key: ExerciseFieldKey;
  label: string;
  tooltip: string;
  iconKey: string;
  value: string;
  isEmpty: boolean;
}

export interface ExerciseParameterGroup {
  id: string;
  title: string;
  items: ExerciseParameterItem[];
}

const DOSAGE_KEYS: ExerciseFieldKey[] = ['sets', 'reps', 'duration', 'executionTime'];
const TIMING_KEYS: ExerciseFieldKey[] = ['tempo', 'restSets', 'restReps', 'preparationTime'];
const POSITION_KEYS: ExerciseFieldKey[] = ['load', 'side', 'rangeOfMotion'];
const CLASSIFICATION_KEYS: ExerciseFieldKey[] = ['difficultyLevel'];

function buildItems(
  keys: ExerciseFieldKey[],
  source: ExerciseFieldValueSource
): ExerciseParameterItem[] {
  return keys.map((key) => {
    const metadata = EXERCISE_FIELD_METADATA[key];
    const emptyPlaceholder =
      key === 'sets' || key === 'reps' || key === 'duration' || key === 'executionTime' || key === 'restSets' || key === 'restReps' || key === 'preparationTime'
        ? EMPTY_NUMERIC_VALUE
        : EMPTY_TEXT_VALUE;
    const raw = metadata.formatValue(source);
    const value = raw ?? emptyPlaceholder;
    return {
      key,
      label: metadata.label,
      tooltip: metadata.tooltip,
      iconKey: metadata.iconKey ?? 'time',
      value,
      isEmpty: raw === null,
    };
  });
}

export function buildExerciseParameterGroups(
  source: ExerciseFieldValueSource
): ExerciseParameterGroup[] {
  return [
    {
      id: 'dosage',
      title: 'Dawkowanie',
      items: buildItems(DOSAGE_KEYS, source),
    },
    {
      id: 'timing',
      title: 'Tempo i przerwy',
      items: buildItems(TIMING_KEYS, source),
    },
    {
      id: 'position',
      title: 'Pozycja i obciążenie',
      items: buildItems(POSITION_KEYS, source),
    },
    {
      id: 'classification',
      title: 'Klasyfikacja',
      items: buildItems(CLASSIFICATION_KEYS, source),
    },
  ];
}
