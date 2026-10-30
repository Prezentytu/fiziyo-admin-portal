import { describe, expect, it } from 'vitest';

import { buildOverrideDelta } from '@/components/shared/exercise/exercisePersonalizationWriter';
import { resolveOverrideInheritedParams } from '../overrideInheritedParams';

const mappingWithoutColumns = {
  id: 'mapping-1',
  exercise: {
    name: 'Mostek biodrowy',
    type: 'REPS',
    side: 'BOTH',
    defaultSets: 4,
    defaultReps: 12,
    defaultRestBetweenSets: 60,
    defaultRestBetweenReps: 0,
    preparationTime: 5,
  },
};

describe('resolveOverrideInheritedParams', () => {
  it('dziedziczy serie i przerwę z ćwiczenia, gdy mapping ich nie ma (wcześniej 0)', () => {
    const inherited = resolveOverrideInheritedParams(mappingWithoutColumns);
    expect(inherited.sets).toBe(4);
    expect(inherited.reps).toBe(12);
    expect(inherited.restSets).toBe(60);
    expect(inherited.restReps).toBe(0);
    expect(inherited.preparationTime).toBe(5);
    expect(inherited.exerciseSide).toBe('both');
  });

  it('kolumny i personalizacja mappingu (overridesJson) wygrywają z domyślnymi ćwiczenia', () => {
    const inherited = resolveOverrideInheritedParams({
      ...mappingWithoutColumns,
      restSets: 30,
      overridesJson: JSON.stringify({ exerciseSide: 'left' }),
    });
    expect(inherited.restSets).toBe(30);
    expect(inherited.exerciseSide).toBe('left');
  });

  it('zapis: nietknięta przerwa nie tworzy nadpisania, a jawne 0 tworzy', () => {
    const inherited = resolveOverrideInheritedParams(mappingWithoutColumns);
    expect(buildOverrideDelta(inherited, { restSets: 60 }).restSets).toBeUndefined();
    expect(buildOverrideDelta(inherited, { restSets: 0 }).restSets).toBe(0);
  });
});
