import { describe, expect, it } from 'vitest';

import { resolvePlanNoteTarget } from './planNoteWriteTarget';

const plan = {
  id: 'set-1',
  kind: 'PATIENT_PLAN',
  exerciseMappings: [
    { id: 'm-1', exerciseId: 'ex-1' },
    { id: 'm-2', exerciseId: 'ex-2' },
  ],
};

describe('resolvePlanNoteTarget', () => {
  it('zwraca pozycję planu pacjenta dla ćwiczenia występującego raz', () => {
    expect(resolvePlanNoteTarget(plan, { id: 'm-1', exerciseId: 'ex-1' })).toEqual({
      exerciseSetId: 'set-1',
      exerciseId: 'ex-1',
    });
  });

  it('nie pisze do szablonu ani zestawu bez rodzaju', () => {
    expect(resolvePlanNoteTarget({ ...plan, kind: 'TEMPLATE' }, { id: 'm-1', exerciseId: 'ex-1' })).toBeNull();
    expect(resolvePlanNoteTarget({ ...plan, kind: null }, { id: 'm-1', exerciseId: 'ex-1' })).toBeNull();
  });

  it('nie pisze dla ćwiczenia dodanego pacjentowi poza zestawem', () => {
    expect(resolvePlanNoteTarget(plan, { id: 'ex-9', exerciseId: 'ex-9' })).toBeNull();
  });

  it('nie pisze, gdy ćwiczenie występuje w zestawie dwa razy', () => {
    const doubled = { ...plan, exerciseMappings: [...plan.exerciseMappings, { id: 'm-3', exerciseId: 'ex-1' }] };
    expect(resolvePlanNoteTarget(doubled, { id: 'm-1', exerciseId: 'ex-1' })).toBeNull();
  });
});
