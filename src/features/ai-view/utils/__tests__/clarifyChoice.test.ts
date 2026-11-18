import { describe, expect, it } from 'vitest';

import {
  clarifyChoicePatientId,
  confirmAnswer,
  confirmPatientSpec,
  labelPatientChoices,
  patientConfirmation,
  resolveClarifyChoice,
} from '../clarifyChoice';
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

// Decyzja właściciela 18.11: pacjent nazwany jednym słowem → „Czy chodzi o…?” z „Tak, {Imię}” i „Inny pacjent”.
describe('patient confirmation', () => {
  const patients = [
    { id: 'p-tomasz', name: 'Tomasz Nowak', contextLabel: 'Ból kolana' },
    { id: 'p-ewa', name: 'Ewa Lis' },
  ];
  const spec = confirmPatientSpec(patients[0], patients);

  it('asks about one patient with what identifies them and two answers', () => {
    expect(spec).toEqual({
      component: 'Clarify',
      question: 'Czy chodzi o Tomasz Nowak (Ból kolana)?',
      options: ['Tak, Tomasz', 'Inny pacjent'],
      choices: [{ label: 'Tak, Tomasz', patientId: 'p-tomasz' }, { label: 'Inny pacjent' }],
    });
    expect(clarifyChoicePatientId(spec, 'Tak, Tomasz', 0)).toBe('p-tomasz');
    expect(clarifyChoicePatientId(spec, 'Inny pacjent', 1)).toBeUndefined();
    expect(labelPatientChoices(spec, patients)).toBe(spec);
  });

  it('is recognized among other questions', () => {
    expect(patientConfirmation(spec)).toEqual({ patientId: 'p-tomasz', yesOption: 'Tak, Tomasz' });
    const which = clarify({ options: ['Ewa Lis'], choices: [{ label: 'Ewa Lis', patientId: 'p-ewa' }] });
    expect(patientConfirmation(which)).toBeNull();
    expect(patientConfirmation({ component: 'PatientPeek' })).toBeNull();
    expect(patientConfirmation(undefined)).toBeNull();
  });

  it.each([
    ['tak', 'yes'],
    ['Tak, Tomasz', 'yes'],
    ['Tomasz', 'yes'],
    ['tak, Tomasz Nowak', 'yes'],
    ['ok, zgadza się', 'yes'],
    ['nie', 'other'],
    ['Inny pacjent', 'other'],
    ['nie, inna pacjentka', 'other'],
    ['ktoś inny', 'other'],
    ['tak, ale dodaj jeszcze mostek', null],
    ['Tomasz Kowalski', null],
    ['Ewa Lis', null],
    ['pokaż ćwiczenia na kolano', null],
  ])('reads the typed answer „%s” as %s', (text, expected) => {
    expect(confirmAnswer(text, 'p-tomasz', patients)).toBe(expected);
  });
});

describe('labelPatientChoices for look-alike names', () => {
  it('tells „Zieliński” and „Zielinski” apart by what differs', () => {
    const spec = clarify({
      question: 'O kogo chodzi?',
      options: ['Marek Zieliński', 'Marek Zielinski'],
      choices: [
        { label: 'Marek Zieliński', patientId: 'p-1' },
        { label: 'Marek Zielinski', patientId: 'p-2' },
      ],
    });
    const labelled = labelPatientChoices(spec, [
      { id: 'p-1', name: 'Marek Zieliński', contextLabel: 'Leczenie podstawowe', isShadowUser: true },
      { id: 'p-2', name: 'Marek Zielinski', contextLabel: 'Leczenie podstawowe', isShadowUser: false },
    ]);
    expect(labelled.options).toEqual(['Marek Zieliński · bez konta', 'Marek Zielinski · ma konto']);
    expect(labelled.choices?.map((choice) => choice.patientId)).toEqual(['p-1', 'p-2']);
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
