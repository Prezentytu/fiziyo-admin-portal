import { describe, expect, it } from 'vitest';

import { buildBuilderStateFromMappings } from '../seedBuilderParamsFromMapping';
import { toPreselectedSet } from '../toPreselectedSet';

describe('toPreselectedSet', () => {
  it('keeps the set parameters so the wizard builder starts from them', () => {
    const preselected = toPreselectedSet({
      id: 'set-1',
      name: 'Bark',
      frequency: { timesPerWeek: 2 },
      exerciseMappings: [
        { id: 'm-1', exerciseId: 'ex-1', order: 1, sets: 2, reps: 12, restSets: 30, notes: 'Powoli', tempo: '3010' },
      ],
    });

    const { params } = buildBuilderStateFromMappings(preselected.exerciseMappings);
    expect(params.get('existing-m-1')).toMatchObject({ sets: 2, reps: 12, restSets: 30, notes: 'Powoli', tempo: '3010' });
    expect(preselected.frequency?.timesPerWeek).toBe(2);
  });
});
