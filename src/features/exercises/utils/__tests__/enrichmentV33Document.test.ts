import { describe, expect, it } from 'vitest';

import fixture from '@/components/shared/exercise/__tests__/fixtures/enrichmentV33.fx-0073.json';
import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import {
  acceptTherapistNoteInput,
  buildV33Document,
  collectV33Edits,
  countV33AiFillSections,
  loadV33Document,
  mergeV33AiFill,
  parseV33JsonDocument,
  pickV33AiFill,
  readTextItem,
  THERAPIST_NOTE_MAX_LENGTH,
  V33_EDITABLE_PATHS,
  withTextItem,
} from '../enrichmentV33Document';

type Doc = Record<string, unknown>;

const loaded = fixture as ExerciseEnrichmentData;

function draftOf(document: ExerciseEnrichmentData = loaded): Doc {
  return JSON.parse(JSON.stringify(document)) as Doc;
}

function section(document: unknown, key: string): Doc {
  return (document as Doc)[key] as Doc;
}

/** Saves the draft the way the form does. */
function save(draft: Doc, base: ExerciseEnrichmentData = loaded): ExerciseEnrichmentData {
  return buildV33Document(base, collectV33Edits(base, draft as ExerciseEnrichmentData));
}

/** Every top-level and second-level key except the listed paths must be deep-equal to the loaded document. */
function expectOnlyChanged(saved: ExerciseEnrichmentData, changedPaths: string[], base: ExerciseEnrichmentData = loaded) {
  const strip = (document: ExerciseEnrichmentData) => {
    const copy = draftOf(document);
    for (const path of changedPaths) {
      const [first, second] = path.split('.');
      if (second) delete (copy[first] as Doc | undefined)?.[second];
      else delete copy[first];
    }
    return copy;
  };
  expect(strip(saved)).toEqual(strip(base));
}

describe('zapis bez zmian', () => {
  it('nie wykrywa żadnej zmiany i oddaje dokument równy wczytanemu, z tą samą kolejnością kluczy', () => {
    const edits = collectV33Edits(loaded, draftOf() as ExerciseEnrichmentData);

    expect(edits).toEqual({});
    expect(JSON.stringify(buildV33Document(loaded, edits))).toBe(JSON.stringify(loaded));
  });

  it('nie zmienia wczytanego dokumentu (pracuje na kopii)', () => {
    const before = JSON.stringify(loaded);
    const draft = draftOf();
    section(draft, 'patient').summary = 'Inne podsumowanie.';

    save(draft);

    expect(JSON.stringify(loaded)).toBe(before);
  });

  it('biały znak na końcu tekstu i pusty wiersz listy nie są zmianą', () => {
    const draft = draftOf();
    const patient = section(draft, 'patient');
    patient.summary = `${String(patient.summary)}  `;
    patient.steps = [...(patient.steps as string[]), ''];
    patient.cues = [...(patient.cues as string[]), '   '];
    patient.mistakes = [...(patient.mistakes as unknown[]), { mistake: '', fix: '' }];
    section(draft, 'therapist').checkpoints = [...(section(draft, 'therapist').checkpoints as unknown[]), { text: '' }];
    section(draft, 'safety').contraindications = [...(section(draft, 'safety').contraindications as unknown[]), { text: ' ' }];
    draft.equipment_items = [...(draft.equipment_items as unknown[]), { label: '', qty: 1, required: true, substitutes: [] }];

    expect(collectV33Edits(loaded, draft as ExerciseEnrichmentData)).toEqual({});
  });
});

describe('zmiana jednego pola zostawia resztę dokumentu', () => {
  const textCases: Array<[path: string, sectionKey: string, key: string]> = [
    ['patient.summary', 'patient', 'summary'],
    ['patient.why', 'patient', 'why'],
    ['patient.when_to_do', 'patient', 'when_to_do'],
    ['patient.should_feel', 'patient', 'should_feel'],
    ['patient.should_not_feel', 'patient', 'should_not_feel'],
    ['patient.easier', 'patient', 'easier'],
    ['patient.harder', 'patient', 'harder'],
    ['breathing.text', 'breathing', 'text'],
    ['safety.stop_if', 'safety', 'stop_if'],
    ['therapist.note', 'therapist', 'note'],
  ];

  it.each(textCases)('%s: nowy tekst trafia przycięty pod tę ścieżkę', (path, sectionKey, key) => {
    const draft = draftOf();
    section(draft, sectionKey)[key] = '  Nowa treść.\nDruga linia.  ';

    const saved = save(draft);

    expect(section(saved, sectionKey)[key]).toBe('Nowa treść.\nDruga linia.');
    expectOnlyChanged(saved, [path]);
  });

  it.each(textCases.filter(([path]) => path !== 'therapist.note'))(
    '%s: opróżniony tekst usuwa tylko ten klucz',
    (path, sectionKey, key) => {
      const draft = draftOf();
      section(draft, sectionKey)[key] = '   ';

      const saved = save(draft);

      expect(key in section(saved, sectionKey)).toBe(false);
      expectOnlyChanged(saved, [path]);
    }
  );

  it('breathing.text: opróżnienie zostawia nietknięte breathing.pattern (null)', () => {
    const draft = draftOf();
    section(draft, 'breathing').text = '';

    expect(save(draft).breathing).toEqual({ pattern: null });
  });

  it('therapist.note: opróżniona notatka znika, a pusta sekcja nadrzędna zostaje', () => {
    const base = { ...loaded, therapist: { note: 'Stara uwaga.' } } as ExerciseEnrichmentData;
    const draft = draftOf(base);
    section(draft, 'therapist').note = '';

    expect(save(draft, base).therapist).toEqual({});
  });

  it('safety.requires_supervision: przełącznik zapisuje wartość logiczną', () => {
    const draft = draftOf();
    section(draft, 'safety').requires_supervision = true;

    const saved = save(draft);

    expect(saved.safety?.requires_supervision).toBe(true);
    expectOnlyChanged(saved, ['safety.requires_supervision']);
  });

  it('patient.steps: zmieniony krok, puste wiersze odpadają', () => {
    const draft = draftOf();
    const steps = [...(loaded.patient?.steps ?? [])];
    steps[1] = 'Ręce połóż na brzuchu.';
    section(draft, 'patient').steps = [...steps, ''];

    const saved = save(draft);

    expect(saved.patient?.steps).toEqual(steps);
    expectOnlyChanged(saved, ['patient.steps']);
  });

  it('patient.steps: usunięty krok przesuwa zdjęcia przypięte do dalszych kroków', () => {
    const base = {
      ...loaded,
      patient: { ...loaded.patient, steps: ['A', 'B', 'C'], step_images: [{ step: 2, url: 'b' }, { step: 3, url: 'c' }] },
    } as ExerciseEnrichmentData;
    const draft = draftOf(base);
    section(draft, 'patient').steps = ['A', '', 'C'];

    const saved = save(draft, base);

    expect(saved.patient?.steps).toEqual(['A', 'C']);
    expect(saved.patient?.step_images).toEqual([{ step: 2, url: 'c' }]);
    expectOnlyChanged(saved, ['patient.steps', 'patient.step_images'], base);
  });

  it('patient.cues: usunięta wskazówka przesuwa fazy pozostałych', () => {
    const draft = draftOf();
    const cues = [...(loaded.patient?.cues ?? [])];
    cues[4] = '';
    section(draft, 'patient').cues = cues;

    const saved = save(draft);

    expect(saved.patient?.cues).toHaveLength(5);
    expect(saved.patient?.cue_phases).toEqual([
      { cue: 0, phase: 'work' },
      { cue: 1, phase: 'work' },
      { cue: 2, phase: 'work' },
      { cue: 3, phase: 'work' },
      { cue: 4, phase: 'rest' },
    ]);
    expectOnlyChanged(saved, ['patient.cues', 'patient.cue_phases']);
  });

  it('patient.cue_phases: zmiana samej fazy nie rusza tekstów wskazówek', () => {
    const draft = draftOf();
    const phases = draftOf().patient as Doc;
    (phases.cue_phases as Array<{ cue: number; phase: string }>)[0].phase = 'preparation';
    section(draft, 'patient').cue_phases = phases.cue_phases;

    const edits = collectV33Edits(loaded, draft as ExerciseEnrichmentData);

    expect(Object.keys(edits)).toEqual(['patient.cue_phases']);
    expectOnlyChanged(buildV33Document(loaded, edits), ['patient.cue_phases']);
  });

  it('patient.mistakes: zmieniony wiersz zapisuje się, nieruszony wraca w zapisanej postaci', () => {
    const base = {
      ...loaded,
      patient: { ...loaded.patient, mistakes: [{ mistake: 'Pierwszy.', fix: '', source: 'audyt' }, { mistake: 'Drugi.', fix: 'Popraw.' }] },
    } as ExerciseEnrichmentData;
    const draft = draftOf(base);
    (section(draft, 'patient').mistakes as Doc[])[1].fix = 'Popraw inaczej.';

    const saved = save(draft, base);

    expect(saved.patient?.mistakes).toEqual([
      { mistake: 'Pierwszy.', fix: '', source: 'audyt' },
      { mistake: 'Drugi.', fix: 'Popraw inaczej.' },
    ]);
    expectOnlyChanged(saved, ['patient.mistakes'], base);
  });

  it('therapist.checkpoints: zmiana tekstu zachowuje evidence i view, nowy punkt ma sam tekst', () => {
    const draft = draftOf();
    const checkpoints = section(draft, 'therapist').checkpoints as unknown[];
    checkpoints[1] = withTextItem(checkpoints[1], 'rzepka przesuwa się w górę');
    checkpoints.push({ text: 'nowy punkt' });

    const saved = save(draft);

    expect(saved.therapist?.checkpoints?.[1]).toEqual({ text: 'rzepka przesuwa się w górę', evidence: 'frame', view: 'closeup' });
    expect(saved.therapist?.checkpoints?.[0]).toEqual(loaded.therapist?.checkpoints?.[0]);
    expect(saved.therapist?.checkpoints?.[5]).toEqual({ text: 'nowy punkt' });
    expectOnlyChanged(saved, ['therapist.checkpoints']);
  });

  it('therapist.checkpoints: usunięty punkt nie przenosi swoich kluczy na sąsiada', () => {
    const draft = draftOf();
    const checkpoints = section(draft, 'therapist').checkpoints as unknown[];
    checkpoints.splice(0, 1);

    expect(save(draft).therapist?.checkpoints).toEqual(loaded.therapist?.checkpoints?.slice(1));
  });

  it('safety.contraindications: edycja tekstu, reszta sekcji bezpieczeństwa bez zmian', () => {
    const draft = draftOf();
    section(draft, 'safety').contraindications = [{ text: ' Świeży uraz kolana. ' }, { text: '' }];

    const saved = save(draft);

    expect(saved.safety?.contraindications).toEqual([{ text: 'Świeży uraz kolana.' }]);
    expect(saved.safety?.flags).toEqual(loaded.safety?.flags);
    expect(saved.safety?.pain_rule).toBe('WS-3');
    expectOnlyChanged(saved, ['safety.contraindications']);
  });

  it('equipment_items: zmiana etykiety, liczby, wymagalności i zamienników zachowuje code', () => {
    const draft = draftOf();
    const items = draft.equipment_items as Doc[];
    items[1] = { ...items[1], label: ' duży ręcznik ', qty: 2, required: false, substitutes: ['zwinięty koc', ' '] };

    const saved = save(draft);

    expect(saved.equipment_items).toEqual([
      loaded.equipment_items?.[0],
      { code: 'towel', label: 'duży ręcznik', qty: 2, required: false, substitutes: ['zwinięty koc'] },
    ]);
    expectOnlyChanged(saved, ['equipment_items']);
  });

  it('equipment_items: nowa pozycja bez kodu, wyczyszczona liczba sztuk znika z wiersza', () => {
    const draft = draftOf();
    (draft.equipment_items as Doc[]).push({ label: 'krzesło', qty: undefined, required: true, substitutes: [] });

    expect(save(draft).equipment_items?.[2]).toEqual({ label: 'krzesło', required: true, substitutes: [] });
  });
});

describe('opróżniona lista', () => {
  it.each([
    ['patient.steps', 'patient', 'steps'],
    ['patient.mistakes', 'patient', 'mistakes'],
    ['safety.contraindications', 'safety', 'contraindications'],
    ['therapist.checkpoints', 'therapist', 'checkpoints'],
  ])('%s: klucz znika, reszta zostaje', (path, sectionKey, key) => {
    const draft = draftOf();
    section(draft, sectionKey)[key] = [];

    const saved = save(draft);

    expect(key in section(saved, sectionKey)).toBe(false);
    expectOnlyChanged(saved, [path]);
  });

  it('equipment_items: klucz znika, reszta zostaje', () => {
    const draft = draftOf();
    draft.equipment_items = [{ label: ' ' }];

    const saved = save(draft);

    expect('equipment_items' in saved).toBe(false);
    expectOnlyChanged(saved, ['equipment_items']);
  });

  it('patient.cues: znikają wskazówki i ich fazy', () => {
    const draft = draftOf();
    section(draft, 'patient').cues = [''];

    const saved = save(draft);

    expect('cues' in section(saved, 'patient')).toBe(false);
    expect('cue_phases' in section(saved, 'patient')).toBe(false);
    expectOnlyChanged(saved, ['patient.cues', 'patient.cue_phases']);
  });
});

describe('klucze, których fizjoterapeuta nie ruszył', () => {
  const withUnknown = {
    ...loaded,
    fiziyo_future: { any: [1, 2, { deep: null }] },
    empty_list: [],
    empty_object: {},
    empty_text: '',
    null_value: null,
    patient: { ...loaded.patient, future_patient_key: '', step_images: [] },
    therapist: { ...loaded.therapist, clinical_notes: 'Stara notatka, zostaje w bazie.' },
    equipment: ['stara lista'],
  } as unknown as ExerciseEnrichmentData;

  it('zostają co do znaku, także puste i spoza kontraktu', () => {
    const draft = draftOf(withUnknown);
    section(draft, 'patient').why = 'Nowe uzasadnienie.';

    const saved = save(draft, withUnknown);

    expect(saved.patient?.why).toBe('Nowe uzasadnienie.');
    expectOnlyChanged(saved, ['patient.why'], withUnknown);
    expect(Object.keys(saved)).toEqual(Object.keys(withUnknown));
    expect(Object.keys(saved.patient ?? {})).toEqual(Object.keys(withUnknown.patient ?? {}));
  });

  it('sekcje zespołu przetrwają, nawet gdy szkic je zgubił albo zmienił', () => {
    const draft = draftOf();
    for (const key of ['provenance', 'lifecycle', 'classification', 'relations', 'media', 'prescription', 'ai', 'side']) {
      delete draft[key];
    }
    draft.schemaVersion = '2.0';
    draft.$schema = 'inny';
    draft.key = 'fx-9999';
    section(draft, 'safety').pain_rule = 'WS-9';
    section(draft, 'safety').flags = [];
    section(draft, 'patient').easier = 'Łatwiej.';

    const saved = save(draft);

    expect(saved.patient?.easier).toBe('Łatwiej.');
    expectOnlyChanged(saved, ['patient.easier']);
  });

  it('pola wycofane dopisane do szkicu nie trafiają do zapisu', () => {
    const draft = draftOf();
    draft.equipment = ['mata'];
    draft.simplified_instruction = 'Kopia podsumowania.';
    Object.assign(section(draft, 'therapist'), { clinical_notes: 'x', indications: ['y'], contraindications: ['z'], progression_notes: 'p' });
    Object.assign(section(draft, 'safety'), { intensity_guide: '5/10' });
    Object.assign(section(draft, 'ai'), { problems: ['ból'] });

    expect(collectV33Edits(loaded, draft as ExerciseEnrichmentData)).toEqual({});
  });

  it('buildV33Document pomija zmianę spoza listy ścieżek edytowalnych', () => {
    const saved = buildV33Document(loaded, {
      'therapist.clinical_notes': 'x',
      equipment: ['mata'],
      schemaVersion: '2.0',
      'safety.intensity_guide': '5/10',
      'patient.why': 'Dozwolona zmiana.',
    });

    expect(saved.patient?.why).toBe('Dozwolona zmiana.');
    expectOnlyChanged(saved, ['patient.why']);
    expect(V33_EDITABLE_PATHS).not.toContain('schemaVersion');
  });
});

describe('wersja i znacznik schematu', () => {
  it('schemaVersion i $schema zostają po każdej zmianie', () => {
    const draft = draftOf();
    section(draft, 'patient').summary = 'Nowe.';

    const saved = save(draft);

    expect(saved.schemaVersion).toBe('3.3');
    expect(saved.$schema).toBe('fiziyo-exercise-v3');
  });

  it('dokument bez $schema dostaje znacznik dopiero przy zapisie zmiany', () => {
    const base: ExerciseEnrichmentData = { schemaVersion: '3.3', patient: { summary: 'Opis.' } };

    expect(buildV33Document(base, {})).toEqual(base);
    expect(buildV33Document(base, { 'patient.why': 'Po co.' })).toEqual({
      schemaVersion: '3.3',
      patient: { summary: 'Opis.', why: 'Po co.' },
      $schema: 'fiziyo-exercise-v3',
    });
  });

  it('pole w sekcji, której dokument nie miał, tworzy tę sekcję', () => {
    const base: ExerciseEnrichmentData = { $schema: 'fiziyo-exercise-v3', schemaVersion: '3.3' };

    expect(buildV33Document(base, { 'therapist.note': 'Uwaga.', 'breathing.text': 'Wydech.' })).toEqual({
      $schema: 'fiziyo-exercise-v3',
      schemaVersion: '3.3',
      therapist: { note: 'Uwaga.' },
      breathing: { text: 'Wydech.' },
    });
  });
});

describe('loadV33Document', () => {
  it('oddaje kopię dokumentu bez normalizacji, także z tekstu JSON', () => {
    const copy = loadV33Document(loaded);

    expect(copy).toEqual(loaded);
    expect(copy).not.toBe(loaded);
    expect(loadV33Document(JSON.stringify(loaded))).toEqual(loaded);
    expect(loadV33Document('nie json')).toEqual({});
    expect(loadV33Document(null)).toEqual({});
  });
});

describe('wiersz z tekstem', () => {
  it('czyta i zmienia tekst obiektu oraz samego tekstu', () => {
    expect(readTextItem({ text: 'a', view: 'side' })).toBe('a');
    expect(readTextItem('b')).toBe('b');
    expect(readTextItem(null)).toBe('');
    expect(withTextItem({ text: 'a', view: 'side' }, 'c')).toEqual({ text: 'c', view: 'side' });
    expect(withTextItem('b', 'c')).toBe('c');
  });
});

describe('limit uwag klinicznych', () => {
  const full = 'a'.repeat(THERAPIST_NOTE_MAX_LENGTH);

  it('przyjmuje tekst do 600 znaków i ucina wklejony dłuższy', () => {
    expect(acceptTherapistNoteInput('', full)).toBe(full);
    expect(acceptTherapistNoteInput(full, `${full}b`)).toBe(full);
    expect(acceptTherapistNoteInput('', `${full}bcd`)).toHaveLength(THERAPIST_NOTE_MAX_LENGTH);
  });

  it('za długi tekst zapisany wcześniej wolno tylko skracać', () => {
    const tooLong = `${full}${'b'.repeat(40)}`;

    expect(acceptTherapistNoteInput(tooLong, `${tooLong}c`)).toBe(tooLong);
    expect(acceptTherapistNoteInput(tooLong, tooLong.slice(0, -1))).toBe(tooLong.slice(0, -1));
  });
});

describe('uzupełnianie przez AI', () => {
  const aiAnswer: ExerciseEnrichmentData = {
    patient: {
      summary: 'Podsumowanie AI.',
      steps: ['Krok AI.'],
      cues: ['Wskazówka AI.'],
      mistakes: [{ mistake: 'Błąd AI.', fix: 'Korekta AI.' }],
      why: 'Po co AI.',
      when_to_do: 'Kiedy AI.',
      should_feel: 'Czuć AI.',
      should_not_feel: 'Nie czuć AI.',
    },
    safety: { stop_if: 'Przerwij AI.', intensity_guide: '5/10', requires_supervision: true },
    therapist: { clinical_notes: 'Notatka AI.', indications: ['Wskazanie AI'], contraindications: ['Przeciwwskazanie AI'] },
    ai: { keywords: ['słowo'], problems: ['problem'] },
    equipment: ['mata'],
  };

  it('z odpowiedzi generatora zostają tylko pola o tym samym miejscu w 3.3', () => {
    expect(pickV33AiFill(aiAnswer)).toEqual({ patient: aiAnswer.patient, safety: { stop_if: 'Przerwij AI.' } });
    expect(pickV33AiFill(null)).toEqual({});
  });

  it('odpowiedź w starym kształcie v2 jest mapowana na te same pola', () => {
    expect(
      pickV33AiFill({ simplified_instruction: 'Skrót.', common_mistakes: [{ mistake: 'Błąd.', fix: 'Korekta.' }] })
    ).toEqual({ patient: { summary: 'Skrót.', mistakes: [{ mistake: 'Błąd.', fix: 'Korekta.' }] } });
  });

  it('wypełnia tylko puste pola i nie dopisuje do szkicu nic poza nimi', () => {
    const base = draftOf() as Doc;
    delete section(base, 'patient').why;
    section(base, 'safety').stop_if = '';

    const merged = mergeV33AiFill(base as ExerciseEnrichmentData, aiAnswer);

    expect(merged.patient?.why).toBe('Po co AI.');
    expect(merged.safety?.stop_if).toBe('Przerwij AI.');
    expect(merged.patient?.steps).toEqual(loaded.patient?.steps);
    expect(merged.breathing).toEqual(loaded.breathing);
    expect(merged.therapist).toEqual(loaded.therapist);
    expect(merged.equipment).toBeUndefined();
    expect(merged.safety?.intensity_guide).toBeUndefined();
    expect(Object.keys(collectV33Edits(base as ExerciseEnrichmentData, merged)).sort()).toEqual([
      'patient.why',
      'safety.stop_if',
    ]);
  });

  it('liczy sekcje, które AI umie uzupełnić', () => {
    expect(countV33AiFillSections(loaded)).toEqual({ filled: 7, total: 7 });
    expect(countV33AiFillSections({ schemaVersion: '3.3', patient: { summary: 'Opis.' } })).toEqual({ filled: 1, total: 7 });
  });
});

describe('panel JSON', () => {
  it('przyjmuje dokument, który zachował wersję', () => {
    expect(parseV33JsonDocument(JSON.stringify(loaded))).toEqual(loaded);
  });

  it.each([
    ['bez schemaVersion', { $schema: 'fiziyo-exercise-v3', patient: { summary: 'Opis.' } }],
    ['ze starszą wersją', { $schema: 'fiziyo-exercise-v3', schemaVersion: '3.2' }],
  ])('odrzuca dokument %s', (_name, document) => {
    expect(() => parseV33JsonDocument(JSON.stringify(document))).toThrow(/schemaVersion/);
  });
});
