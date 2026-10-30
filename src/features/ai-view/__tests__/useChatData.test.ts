import { describe, expect, it } from 'vitest';

import { toChatSets } from '../useChatData';

describe('toChatSets', () => {
  it('offers only catalog sets, but finds any organization set a card names (a patient plan too)', () => {
    const raw = [
      { id: 's-template', name: 'Kolano', kind: 'TEMPLATE', isTemplate: true, exerciseMappings: [] },
      { id: 's-plan', name: 'Plan Anny', kind: 'PATIENT_PLAN', isTemplate: false, exerciseMappings: [] },
    ] as unknown as Parameters<typeof toChatSets>[0];

    const { sets, organizationSets } = toChatSets(raw);

    expect(sets.map((set) => set.id)).toEqual(['s-template']);
    expect(organizationSets.map((set) => set.id)).toEqual(['s-template', 's-plan']);
  });
});
