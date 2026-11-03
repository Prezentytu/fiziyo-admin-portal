import type { ExerciseSet } from '../types';
import { normalizeFrequencySeed, type FrequencyInput } from './scheduleFrequencyUtils';

type PreselectableSet = Omit<ExerciseSet, 'frequency'> & { frequency?: FrequencyInput | null };

/**
 * A set from the sets list opens the wizard as is: its mappings carry the set's own parameters,
 * so the builder starts from them and not from exercise template defaults.
 */
export function toPreselectedSet(set: PreselectableSet): ExerciseSet {
  return { ...set, frequency: set.frequency ? normalizeFrequencySeed(set.frequency) : undefined };
}
