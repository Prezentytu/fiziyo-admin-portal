import { describe, expect, it } from 'vitest';

import { resolveClarifyChoice } from '../clarifyChoice';
import { toChatViewSpec } from '../viewSpec';

function clarify(input: Record<string, unknown>) {
  const spec = toChatViewSpec({ component: 'Clarify', question: 'Który zestaw?', ...input });
  if (spec.component !== 'Clarify') throw new Error('expected Clarify');
  return spec;
}

describe('resolveClarifyChoice', () => {
  it('opens the chosen set as a draft for the chosen patient without asking the model', () => {
    const spec = clarify({
      options: ['Kolano faza 2', 'Inny zestaw'],
      choices: [{ label: 'Kolano faza 2', setId: 'set-1', patientId: 'p-jan' }, { label: 'Inny zestaw' }],
    });

    expect(resolveClarifyChoice(spec, 'Kolano faza 2')).toEqual({
      component: 'SetDraft',
      setId: 'set-1',
      patientId: 'p-jan',
      exerciseIds: [],
    });
    expect(resolveClarifyChoice(spec, 'Inny zestaw')).toBeNull();
  });

  it('sends a patient-only answer and plain options to the model as before', () => {
    const patients = clarify({
      options: ['Ewa Lis', 'Ewa Kot'],
      choices: [{ label: 'Ewa Lis', patientId: 'p-ewa-1' }],
    });
    const plain = clarify({ options: ['Od dziś', 'Od jutra'] });

    expect(resolveClarifyChoice(patients, 'Ewa Lis')).toBeNull();
    expect(resolveClarifyChoice(plain, 'Od dziś')).toBeNull();
  });
});

describe('toChatViewSpec choices', () => {
  it('keeps only choices that match an option and carry an ID', () => {
    const spec = clarify({
      options: ['Kolano', 'Biodro'],
      choices: [
        { label: 'Kolano', setId: 'set-1' },
        { label: 'Bark', setId: 'set-9' },
        { label: 'Biodro', setId: null, patientId: null },
      ],
    });

    expect(spec.choices).toEqual([{ label: 'Kolano', setId: 'set-1' }, { label: 'Biodro' }]);
  });

  it('ignores malformed choices from an older or broken backend', () => {
    expect(clarify({ options: ['Kolano'], choices: 'set-1' })).toEqual({
      component: 'Clarify',
      question: 'Który zestaw?',
      options: ['Kolano'],
    });
    expect(clarify({ options: ['Kolano'], choices: [{ label: 'Kolano' }] }).choices).toBeUndefined();
  });
});
