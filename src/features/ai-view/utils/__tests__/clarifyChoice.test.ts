import { describe, expect, it } from 'vitest';

import { clarifyChoicePatientId, labelPatientChoices, resolveClarifyChoice } from '../clarifyChoice';
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

  it('leaves a patient-only answer and plain options to their own paths', () => {
    const patients = clarify({
      options: ['Ewa Lis', 'Ewa Kot'],
      choices: [{ label: 'Ewa Lis', patientId: 'p-ewa-1' }],
    });
    const plain = clarify({ options: ['Od dziś', 'Od jutra'] });

    expect(resolveClarifyChoice(patients, 'Ewa Lis')).toBeNull();
    expect(resolveClarifyChoice(plain, 'Od dziś')).toBeNull();
  });
});

// Test asystenta 17.11 (K3): backend pyta o imienników dwiema identycznymi etykietami „Jan Kowalski”.
describe('patient choices', () => {
  const namesakes = clarify({
    question: 'Masz kilku pacjentów o tym imieniu. O kogo chodzi?',
    options: ['Jan Kowalski', 'Jan Kowalski'],
    choices: [
      { label: 'Jan Kowalski', patientId: 'p-jan-1' },
      { label: 'Jan Kowalski', patientId: 'p-jan-2' },
    ],
  });
  const patients = [
    { id: 'p-jan-1', name: 'Jan Kowalski', contextLabel: 'Ból kolana' },
    { id: 'p-jan-2', name: 'Jan Kowalski', isShadowUser: true },
  ];

  it('picks the patient of the clicked chip, also when two chips read the same', () => {
    expect(clarifyChoicePatientId(namesakes, 'Jan Kowalski', 0)).toBe('p-jan-1');
    expect(clarifyChoicePatientId(namesakes, 'Jan Kowalski', 1)).toBe('p-jan-2');
    expect(clarifyChoicePatientId(clarify({ options: ['Od dziś', 'Od jutra'] }), 'Od dziś', 0)).toBeUndefined();
  });

  it('leaves a chip tied to a set to the set draft', () => {
    const spec = clarify({
      options: ['Kolano faza 2'],
      choices: [{ label: 'Kolano faza 2', setId: 'set-1', patientId: 'p-jan-1' }],
    });
    expect(clarifyChoicePatientId(spec, 'Kolano faza 2', 0)).toBeUndefined();
  });

  it('relabels namesakes so the therapist can tell them apart', () => {
    const labelled = labelPatientChoices(namesakes, patients);
    expect(labelled).toMatchObject({
      options: ['Jan Kowalski · Ból kolana', 'Jan Kowalski · bez konta'],
      choices: [
        { label: 'Jan Kowalski · Ból kolana', patientId: 'p-jan-1' },
        { label: 'Jan Kowalski · bez konta', patientId: 'p-jan-2' },
      ],
    });
  });

  it('touches nothing when the labels already differ or are not patients', () => {
    const plain = clarify({ options: ['Od dziś', 'Od jutra'] });
    expect(labelPatientChoices(plain, patients)).toBe(plain);
    const distinct = clarify({
      options: ['Ewa Lis', 'Ewa Kot'],
      choices: [
        { label: 'Ewa Lis', patientId: 'p-1' },
        { label: 'Ewa Kot', patientId: 'p-2' },
      ],
    });
    expect(labelPatientChoices(distinct, patients)).toBe(distinct);
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
