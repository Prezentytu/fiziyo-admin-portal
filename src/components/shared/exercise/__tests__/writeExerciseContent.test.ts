import { describe, expect, it } from 'vitest';

import type { ExerciseEnrichmentData } from '@/graphql/types/exerciseEnrichment.types';

import {
  buildV33Document,
  collectV33Edits,
  findV33EditCollisions,
  isSameV33Document,
  isV33EditablePath,
  loadV33Document,
  NEW_PRECAUTION_GROUP,
  precautionGroupLabel,
  readTextItem,
  rebaseV33Draft,
  sameJson,
  V33_CUE_PHASES,
  V33_EDITABLE_PATHS,
  V33_PATIENT_VISIBLE_PATHS,
  V33_PRECAUTION_GROUP_CODES,
  V33_WRITTEN_DICTIONARIES,
  withTextItem,
} from '../writeExerciseContent';
import fixture from './fixtures/enrichmentV33.fx-0073.json';
import {
  classesOfV33Leaf,
  editableRootOf,
  GOLDEN_EDITABLE_PATHS,
  GOLDEN_LEAF_PATHS,
  leafPaths,
  leafShape,
  V33_EDITABLE_ABSENT_FROM_GOLDEN,
  V33_PATHS_EVERY_EDITOR_COVERS,
  V33_READ_ONLY_PATHS,
  V33_SKIPPED_PATHS,
} from './fixtures/v33GoldenPaths';

type Doc = Record<string, unknown>;

const loaded = fixture as ExerciseEnrichmentData;

function draftOf(document: ExerciseEnrichmentData = loaded): Doc {
  return JSON.parse(JSON.stringify(document)) as Doc;
}

function section(document: unknown, key: string): Doc {
  return (document as Doc)[key] as Doc;
}

/** Saves the draft the way every screen does. */
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

  describe('safety.precautions', () => {
    const precautions = [
      { group: 'pregnancy_postpartum', text: 'W ciąży po 20. tygodniu ćwicz w pozycji półleżącej.', source: 'S2', reviewed: { by: 'kp', ok: true } },
      { group: 'hip_replacement', text: 'Po endoprotezie biodra nie krzyżuj nóg.' },
    ];
    const withPrecautions = { ...loaded, safety: { ...loaded.safety, precautions } } as ExerciseEnrichmentData;
    const rowsOf = (document: unknown) => section(document, 'safety').precautions as unknown[];

    it('jest na liście ścieżek edytowalnych', () => {
      expect(V33_EDITABLE_PATHS).toContain('safety.precautions');
    });

    it('zmiana tekstu jednego wiersza zmienia tylko tę ścieżkę i zachowuje group oraz dodatkowe klucze', () => {
      const draft = draftOf(withPrecautions);
      rowsOf(draft)[0] = withTextItem(rowsOf(draft)[0], ' W ciąży ćwicz w pozycji półleżącej. ');

      expect(Object.keys(collectV33Edits(withPrecautions, draft as ExerciseEnrichmentData))).toEqual(['safety.precautions']);
      const saved = save(draft, withPrecautions);

      expect(rowsOf(saved)).toEqual([
        { group: 'pregnancy_postpartum', text: 'W ciąży ćwicz w pozycji półleżącej.', source: 'S2', reviewed: { by: 'kp', ok: true } },
        precautions[1],
      ]);
      expect(Object.keys(rowsOf(saved)[0] as Doc)).toEqual(['group', 'text', 'source', 'reviewed']);
      expectOnlyChanged(saved, ['safety.precautions'], withPrecautions);
    });

    it('nowy wiersz dostaje kod grupy „other” z kontraktu, kolejność zostaje, pusty wiersz odpada', () => {
      const draft = draftOf(withPrecautions);
      rowsOf(draft).push({ group: NEW_PRECAUTION_GROUP, text: 'Przy zawrotach głowy ćwicz na siedząco.' }, { group: NEW_PRECAUTION_GROUP, text: ' ' });

      expect(rowsOf(save(draft, withPrecautions))).toEqual([
        ...precautions,
        { group: 'other', text: 'Przy zawrotach głowy ćwicz na siedząco.' },
      ]);
    });

    it('pierwsza ostrożność w dokumencie bez pola tworzy klucz, reszta bezpieczeństwa bez zmian', () => {
      const draft = draftOf();
      section(draft, 'safety').precautions = [{ group: NEW_PRECAUTION_GROUP, text: 'Seniorzy: ćwicz przy oparciu.' }];

      const saved = save(draft);

      expect(rowsOf(saved)).toEqual([{ group: 'other', text: 'Seniorzy: ćwicz przy oparciu.' }]);
      expectOnlyChanged(saved, ['safety.precautions']);
    });

    it('opróżniona lista usuwa klucz, reszta zostaje', () => {
      const draft = draftOf(withPrecautions);
      section(draft, 'safety').precautions = [];

      const saved = save(draft, withPrecautions);

      expect('precautions' in section(saved, 'safety')).toBe(false);
      expectOnlyChanged(saved, ['safety.precautions'], withPrecautions);
    });

    it('nieruszona lista wraca identyczna, także z pustym wierszem dodanym w formularzu', () => {
      const untouched = draftOf(withPrecautions);
      expect(collectV33Edits(withPrecautions, untouched as ExerciseEnrichmentData)).toEqual({});
      expect(JSON.stringify(save(untouched, withPrecautions))).toBe(JSON.stringify(withPrecautions));

      rowsOf(untouched).push({ group: NEW_PRECAUTION_GROUP, text: '' });
      expect(collectV33Edits(withPrecautions, untouched as ExerciseEnrichmentData)).toEqual({});

      const emptyRowOnly = draftOf();
      section(emptyRowOnly, 'safety').precautions = [{ group: NEW_PRECAUTION_GROUP, text: '' }];
      expect(JSON.stringify(save(emptyRowOnly))).toBe(JSON.stringify(loaded));
    });
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
    for (const key of ['provenance', 'lifecycle', 'classification', 'relations', 'media', 'prescription', 'side']) {
      delete draft[key];
    }
    draft.schemaVersion = '2.0';
    draft.$schema = 'inny';
    draft.key = 'fx-9999';
    Object.assign(section(draft, 'ai'), { problems: ['dopisane'], suitable_for: ['dopisane'] });
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

  it('dokument bez $schema dostaje znacznik przy każdym zapisie, reszta kluczy bez zmian', () => {
    const base: ExerciseEnrichmentData = { schemaVersion: '3.3', patient: { summary: 'Opis.' } };

    expect(buildV33Document(base, {})).toEqual({ ...base, $schema: 'fiziyo-exercise-v3' });
    expect(buildV33Document(base, { 'patient.why': 'Po co.' })).toEqual({
      schemaVersion: '3.3',
      patient: { summary: 'Opis.', why: 'Po co.' },
      $schema: 'fiziyo-exercise-v3',
    });
  });

  it('znacznik o innej wartości jest zastępowany tym, który backend przepuszcza bez przebudowy', () => {
    const base = { $schema: 'fiziyo-exercise-v3.3', schemaVersion: '3.3', side: { mode: 'each_side' } } as ExerciseEnrichmentData;

    expect(buildV33Document(base, { 'patient.why': 'Po co.' })).toEqual({
      $schema: 'fiziyo-exercise-v3',
      schemaVersion: '3.3',
      side: { mode: 'each_side' },
      patient: { why: 'Po co.' },
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

describe('ai.keywords', () => {
  it('dopisane słowo kluczowe zapisuje się, reszta sekcji ai i dokumentu bez zmian', () => {
    const base = { ...loaded, ai: { ...loaded.ai, keywords: ['kolano', 'udo'], future_ai_key: { x: 1 } } } as ExerciseEnrichmentData;
    const draft = draftOf(base);
    section(draft, 'ai').keywords = ['kolano', 'udo', ' rzepka ', ''];

    const edits = collectV33Edits(base, draft as ExerciseEnrichmentData);
    const saved = buildV33Document(base, edits);

    expect(Object.keys(edits)).toEqual(['ai.keywords']);
    expect(saved.ai?.keywords).toEqual(['kolano', 'udo', 'rzepka']);
    expectOnlyChanged(saved, ['ai.keywords'], base);
  });

  it('opróżniona lista usuwa klucz, pusty wpis nie jest zmianą', () => {
    const base = { ...loaded, ai: { keywords: ['kolano'] } } as ExerciseEnrichmentData;
    const untouched = draftOf(base);
    section(untouched, 'ai').keywords = ['kolano', ' '];
    expect(collectV33Edits(base, untouched as ExerciseEnrichmentData)).toEqual({});

    const emptied = draftOf(base);
    section(emptied, 'ai').keywords = [];
    expect(save(emptied, base).ai).toEqual({});
  });
});

describe('lista ścieżek edytowalnych (zapadka)', () => {
  /** A value that differs from whatever the fixture holds under the path, in the shape the path stores. */
  const changedValue: Record<string, unknown> = {
    'patient.summary': 'Zmienione podsumowanie.',
    'patient.why': 'Zmienione po co.',
    'patient.when_to_do': 'Zmienione kiedy.',
    'patient.should_feel': 'Zmienione co czuć.',
    'patient.should_not_feel': 'Zmienione czego nie czuć.',
    'patient.easier': 'Zmienione łatwiej.',
    'patient.harder': 'Zmienione trudniej.',
    'breathing.text': 'Zmieniony oddech.',
    'safety.stop_if': 'Zmieniony objaw.',
    'therapist.note': 'Zmieniona uwaga.',
    'safety.requires_supervision': true,
    'patient.steps': ['Zmieniony krok.'],
    'patient.step_images': [{ step: 1, url: 'https://example.test/zmienione.png' }],
    'patient.cues': ['Zmieniona wskazówka.'],
    'patient.cue_phases': [{ cue: 0, phase: 'rest' }],
    'patient.mistakes': [{ mistake: 'Zmieniony błąd.', fix: 'Poprawka.' }],
    'safety.contraindications': [{ text: 'Zmienione przeciwwskazanie.' }],
    'safety.precautions': [{ group: 'other', text: 'Zmieniona ostrożność.' }],
    'therapist.checkpoints': [{ text: 'Zmieniony punkt.' }],
    equipment_items: [{ label: 'zmieniony sprzęt' }],
    'ai.keywords': ['zmienione'],
  };

  it('każda ścieżka edytowalna wynikająca ze złotego rekordu ma przypadek w tym teście', () => {
    expect(Object.keys(changedValue).sort()).toEqual([...V33_PATHS_EVERY_EDITOR_COVERS].sort());
  });

  it.each(V33_EDITABLE_PATHS.map((path) => [path]))('%s: zmiana w szkicu trafia do zapisanego dokumentu', (path) => {
    const draft = draftOf();
    const keys = path.split('.');
    // A cue phase needs its cue, a step photo its step: change the pair the way a screen does.
    if (path === 'patient.cue_phases') section(draft, 'patient').cues = changedValue['patient.cues'];
    if (path === 'patient.step_images') section(draft, 'patient').steps = changedValue['patient.steps'];
    let target = draft;
    for (const key of keys.slice(0, -1)) target = (target[key] ??= {}) as Doc;
    target[keys[keys.length - 1]] = changedValue[path];

    const saved = save(draft) as Doc;

    let stored: unknown = saved;
    for (const key of keys) stored = (stored as Doc)[key];
    expect(stored).toEqual(changedValue[path]);
  });

  it('isV33EditablePath przyjmuje wpis z listy i jego wnętrze, odrzuca resztę dokumentu', () => {
    expect(isV33EditablePath('patient.steps')).toBe(true);
    expect(isV33EditablePath('patient.steps.2')).toBe(true);
    expect(isV33EditablePath('ai.keywords')).toBe(true);
    expect(isV33EditablePath('patient.stepsX')).toBe(false);
    expect(isV33EditablePath('patient')).toBe(false);
    expect(isV33EditablePath('ai.problems')).toBe(false);
    expect(isV33EditablePath('safety.pain_rule')).toBe(false);
    expect(isV33EditablePath('classification.position')).toBe(false);
    expect(isV33EditablePath('schemaVersion')).toBe(false);
  });

  it('każde pole tekstowe i lista, które dostaje pacjent, da się poprawić w portalu', () => {
    const readOnlyForPortal = ['side.mode', 'side.per_side_dose', 'side.start', 'side.shown_in_media'];

    expect(V33_PATIENT_VISIBLE_PATHS.filter((path) => !isV33EditablePath(path))).toEqual(readOnlyForPortal);
  });
});

describe('słowniki kontraktu', () => {
  // Przepisane z KONTRAKT-v3.3.md §6.1 (lista zamknięta). Zmiana kontraktu zmienia tę listę i słownik razem.
  const contractPrecautionGroups = [
    'hip_replacement',
    'knee_replacement',
    'shoulder_instability_postop',
    'post_surgery_injury',
    'pregnancy_postpartum',
    'fall_risk',
    'osteoporosis',
    'diabetic_foot',
    'hypertension_heart_glaucoma',
    'hypermobility',
    'spinal_stenosis',
    'bone_metastasis',
    'anticoagulants',
    'cervical_risk',
    'hernia_pelvic_floor',
    'other',
  ];

  it('kody grup ostrożności to lista z kontraktu §6.1, w tej samej kolejności', () => {
    expect(V33_PRECAUTION_GROUP_CODES).toEqual(contractPrecautionGroups);
  });

  it('kod grupy dla nowej ostrożności jest ze słownika', () => {
    expect(NEW_PRECAUTION_GROUP).toBe('other');
    expect(contractPrecautionGroups).toContain(NEW_PRECAUTION_GROUP);
  });

  it('fazy wskazówki to trzy wartości z kontraktu §1', () => {
    expect(V33_CUE_PHASES).toEqual(['preparation', 'work', 'rest']);
  });

  it('każdy słownik zapisywany przez portal wskazuje ścieżkę wewnątrz listy ścieżek edytowalnych', () => {
    for (const path of Object.keys(V33_WRITTEN_DICTIONARIES)) {
      expect(isV33EditablePath(path.split('[]')[0])).toBe(true);
    }
  });

  it('etykieta grupy: kod ze słownika po polsku, kod spoza słownika bez zmian', () => {
    expect(precautionGroupLabel('pregnancy_postpartum')).toBe('Ciąża i połóg');
    expect(precautionGroupLabel('inne')).toBe('inne');
    expect(precautionGroupLabel(null)).toBeNull();
  });
});

describe('ochrona przed nadpisaniem cudzej zmiany', () => {
  it('ten sam dokument mimo innej kolejności kluczy i braku znacznika', () => {
    const reordered = { patient: { why: 'B', summary: 'A' }, schemaVersion: '3.3' };
    const original = { $schema: 'fiziyo-exercise-v3', schemaVersion: '3.3', patient: { summary: 'A', why: 'B' } };

    expect(isSameV33Document(original, reordered)).toBe(true);
    expect(isSameV33Document(original, JSON.stringify(reordered))).toBe(true);
  });

  it('inna wartość, inna kolejność listy albo dodatkowy klucz to inny dokument', () => {
    const original = { schemaVersion: '3.3', patient: { steps: ['A', 'B'] } };

    expect(isSameV33Document(original, { schemaVersion: '3.3', patient: { steps: ['B', 'A'] } })).toBe(false);
    expect(isSameV33Document(original, { schemaVersion: '3.3', patient: { steps: ['A', 'B'], why: 'x' } })).toBe(false);
    expect(isSameV33Document(original, { ...original, safety: { contraindications: [{ text: 'Nowe.' }] } })).toBe(false);
    expect(isSameV33Document(original, null)).toBe(false);
  });

  it('przeniesienie szkicu na aktualną wersję zachowuje cudzą zmianę i niezapisaną zmianę fizjoterapeuty', () => {
    const draft = draftOf();
    section(draft, 'patient').steps = ['Mój poprawiony krok.'];
    const current = draftOf() as ExerciseEnrichmentData & Doc;
    section(current, 'safety').contraindications = [{ text: 'Przeciwwskazanie dopisane przez import.' }];
    current.imported_key = { batch: 'p002' };

    const rebased = rebaseV33Draft(loaded, draft as ExerciseEnrichmentData, current);

    expect(rebased.patient?.steps).toEqual(['Mój poprawiony krok.']);
    expect(rebased.safety?.contraindications).toEqual([{ text: 'Przeciwwskazanie dopisane przez import.' }]);
    expect((rebased as Doc).imported_key).toEqual({ batch: 'p002' });
    // What is left to save against the fresh document is exactly the therapist's own edit.
    expect(Object.keys(collectV33Edits(current, rebased))).toEqual(['patient.steps']);
    expectOnlyChanged(buildV33Document(current, collectV33Edits(current, rebased)), ['patient.steps'], current);
  });

  describe('to samo pole zmienione przez obie osoby (odbiór 12.11, F2)', () => {
    const OTHER_STEPS = ['Krok zapisany przez drugą osobę.'];
    const MY_STEPS = ['Mój poprawiony krok.'];

    function bothEdited() {
      const draft = draftOf();
      section(draft, 'patient').steps = MY_STEPS;
      section(draft, 'patient').why = 'Moje po co.';
      const current = draftOf() as ExerciseEnrichmentData & Doc;
      section(current, 'patient').steps = OTHER_STEPS;
      section(current, 'safety').stop_if = 'Objaw dopisany przez drugą osobę.';
      return { draft: draft as ExerciseEnrichmentData, current };
    }

    it('wykrywa kolizję tylko w polu zmienionym przez obie osoby i oddaje obie wartości', () => {
      const { draft, current } = bothEdited();

      expect(findV33EditCollisions(loaded, draft, current)).toEqual([
        { path: 'patient.steps', mine: MY_STEPS, theirs: OTHER_STEPS },
      ]);
    });

    it('nie ma kolizji, gdy zmiany dotyczą różnych pól albo obie osoby wpisały to samo', () => {
      const draft = draftOf();
      section(draft, 'patient').why = 'To samo zdanie.';
      const otherField = draftOf() as ExerciseEnrichmentData;
      section(otherField, 'safety').stop_if = 'Inne pole.';
      const sameValue = draftOf() as ExerciseEnrichmentData;
      section(sameValue, 'patient').why = 'To samo zdanie. ';

      expect(findV33EditCollisions(loaded, draft as ExerciseEnrichmentData, otherField)).toEqual([]);
      expect(findV33EditCollisions(loaded, draft as ExerciseEnrichmentData, sameValue)).toEqual([]);
      expect(findV33EditCollisions(loaded, draftOf() as ExerciseEnrichmentData, otherField)).toEqual([]);
    });

    it('pole opróżnione przez jedną z osób też jest kolizją', () => {
      const draft = draftOf();
      section(draft, 'patient').why = '';
      const current = draftOf() as ExerciseEnrichmentData;
      section(current, 'patient').why = 'Cudze po co.';

      expect(findV33EditCollisions(loaded, draft as ExerciseEnrichmentData, current)).toEqual([
        { path: 'patient.why', mine: undefined, theirs: 'Cudze po co.' },
      ]);
    });

    it('wybór „zostaw cudzą wersję” odrzuca moją zmianę tego pola, reszta moich zmian zostaje', () => {
      const { draft, current } = bothEdited();

      const rebased = rebaseV33Draft(loaded, draft, current, ['patient.steps']);

      expect(rebased.patient?.steps).toEqual(OTHER_STEPS);
      expect(rebased.patient?.why).toBe('Moje po co.');
      expect(rebased.safety?.stop_if).toBe('Objaw dopisany przez drugą osobę.');
      expect(Object.keys(collectV33Edits(current, rebased))).toEqual(['patient.why']);
    });

    it('wybór „zostaw moją wersję” (domyślny dla wywołania bez listy) nakłada moją zmianę', () => {
      const { draft, current } = bothEdited();

      const rebased = rebaseV33Draft(loaded, draft, current);

      expect(rebased.patient?.steps).toEqual(MY_STEPS);
      expect(Object.keys(collectV33Edits(current, rebased)).sort()).toEqual(['patient.steps', 'patient.why']);
    });

    it('cudze kroki zostają razem ze swoimi zdjęciami, a cudze wskazówki ze swoimi fazami', () => {
      const draft = draftOf();
      section(draft, 'patient').steps = MY_STEPS;
      section(draft, 'patient').step_images = [{ step: 1, url: 'https://example.test/moje.png' }];
      section(draft, 'patient').cues = ['Moja wskazówka.'];
      section(draft, 'patient').cue_phases = [{ cue: 0, phase: 'rest' }];
      const current = draftOf() as ExerciseEnrichmentData;
      section(current, 'patient').steps = OTHER_STEPS;
      section(current, 'patient').cues = ['Cudza wskazówka.'];
      section(current, 'patient').cue_phases = [{ cue: 0, phase: 'work' }];

      const rebased = rebaseV33Draft(loaded, draft as ExerciseEnrichmentData, current, ['patient.steps', 'patient.cues']);

      expect(rebased.patient).toEqual(current.patient);
    });
  });

  it('bez niezapisanych zmian przeniesiony szkic to aktualny dokument', () => {
    const current = { ...loaded, patient: { ...loaded.patient, why: 'Zmienione przez kogoś.' } } as ExerciseEnrichmentData;

    expect(rebaseV33Draft(loaded, draftOf() as ExerciseEnrichmentData, current)).toEqual(current);
  });
});

describe('kolejność kluczy obiektu nie jest zmianą (odbiór 13.11, n4)', () => {
  /** Kolumna JSONB oddaje klucze obiektu posortowane po długości, potem bajtowo; kolejność elementów listy zostaje. */
  function asJsonbReturns<T>(value: T): T {
    if (Array.isArray(value)) return value.map(asJsonbReturns) as T;
    if (value && typeof value === 'object') {
      const record = value as Doc;
      const keys = Object.keys(record).sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
      return Object.fromEntries(keys.map((key) => [key, asJsonbReturns(record[key])])) as T;
    }
    return value;
  }

  /** Dokument w kolejności kluczy, w jakiej buduje go portal: odwrotnej do tej, którą odda baza. */
  function sentByPortal(): ExerciseEnrichmentData {
    const document = draftOf();
    const patient = section(document, 'patient');
    patient.steps = ['Krok pierwszy.', 'Krok drugi.', 'Krok trzeci.'];
    patient.step_images = [
      { step: 1, url: 'https://example.test/a.png' },
      { step: 2, url: 'https://example.test/b.png' },
    ];
    patient.cues = ['Wskazówka pierwsza.', 'Wskazówka druga.'];
    patient.cue_phases = [
      { phase: 'work', cue: 0 },
      { phase: 'rest', cue: 1 },
    ];
    patient.mistakes = [
      { mistake: 'Biodro ucieka w bok.', fix: 'Ustaw miednicę równo.' },
      { mistake: 'Wstrzymany oddech.', fix: 'Oddychaj spokojnie.' },
    ];
    return document as ExerciseEnrichmentData;
  }

  const sent = sentByPortal();
  const stored = asJsonbReturns(sent);

  it('wspólna funkcja porównania: dwa dokumenty różne tylko kolejnością kluczy to ta sama wartość', () => {
    expect(JSON.stringify(stored)).not.toBe(JSON.stringify(sent));
    expect(sameJson(sent, stored)).toBe(true);
    expect(sameJson([{ step: 1, url: 'a' }], [{ url: 'a', step: 1 }])).toBe(true);
    expect(sameJson([{ step: 1, url: 'a' }], [{ url: 'b', step: 1 }])).toBe(false);
    expect(sameJson(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(sameJson({ a: 1, b: null }, { a: 1 })).toBe(false);
    expect(sameJson(undefined, undefined)).toBe(true);
  });

  it('serwer z testu naprawdę przestawia klucze, a nie elementy list', () => {
    expect(JSON.stringify(stored)).not.toBe(JSON.stringify(sent));
    expect(Object.keys(stored.patient?.step_images?.[0] ?? {})).toEqual(['url', 'step']);
    expect(Object.keys(stored.patient?.cue_phases?.[0] ?? {})).toEqual(['cue', 'phase']);
    expect(Object.keys(stored.patient?.mistakes?.[0] ?? {})).toEqual(['fix', 'mistake']);
    expect(stored).toEqual(sent);
  });

  it('dokument oddany przez bazę z innym układem kluczy nie ma żadnej zmiany względem wysłanego', () => {
    expect(collectV33Edits(sent, stored)).toEqual({});
    expect(collectV33Edits(stored, sent)).toEqual({});
  });

  it.each([
    ['kroki', 'patient.steps', (patient: Doc) => (patient.steps = ['Krok pierwszy, poprawiony.', 'Krok drugi.', 'Krok trzeci.'])],
    ['wskazówki', 'patient.cues', (patient: Doc) => (patient.cues = ['Wskazówka pierwsza, poprawiona.', 'Wskazówka druga.'])],
  ] as const)('moja zmiana listy „%s” przy cudzej zmianie innego pola: baza nie zmieniła niczego w parze', (_name, path, edit) => {
    const draft = draftOf(sent);
    edit(section(draft, 'patient'));
    const current = draftOf(stored) as ExerciseEnrichmentData;
    section(current, 'patient').why = 'Cudze po co.';

    expect(Object.keys(collectV33Edits(sent, current))).toEqual(['patient.why']);
    expect(findV33EditCollisions(sent, draft as ExerciseEnrichmentData, current)).toEqual([]);
    const rebased = rebaseV33Draft(sent, draft as ExerciseEnrichmentData, current);
    expect(Object.keys(collectV33Edits(current, rebased))).toEqual([path]);
  });

  it('moja zmiana błędu przy cudzej zmianie innego pola nie jest kolizją', () => {
    const draft = draftOf(sent);
    section(draft, 'patient').mistakes = [
      { mistake: 'Biodro ucieka w bok, poprawione.', fix: 'Ustaw miednicę równo.' },
      { mistake: 'Wstrzymany oddech.', fix: 'Oddychaj spokojnie.' },
    ];
    const current = draftOf(stored) as ExerciseEnrichmentData;
    section(current, 'patient').why = 'Cudze po co.';

    expect(findV33EditCollisions(sent, draft as ExerciseEnrichmentData, current)).toEqual([]);
  });

  it('obie osoby wpisały ten sam błąd, tylko z innym układem kluczy: nie ma kolizji', () => {
    const draft = draftOf(sent);
    section(draft, 'patient').mistakes = [{ mistake: 'Nowy błąd.', fix: 'Nowa poprawka.' }];
    const current = draftOf(stored) as ExerciseEnrichmentData;
    section(current, 'patient').mistakes = [{ fix: 'Nowa poprawka.', mistake: 'Nowy błąd.' }];

    expect(findV33EditCollisions(sent, draft as ExerciseEnrichmentData, current)).toEqual([]);
  });

  it('prawdziwa różnica wartości nadal jest kolizją, także gdy baza przestawiła klucze', () => {
    const draft = draftOf(sent);
    section(draft, 'patient').mistakes = [{ mistake: 'Mój błąd.', fix: 'Ustaw miednicę równo.' }];
    section(draft, 'patient').step_images = [{ step: 1, url: 'https://example.test/moje.png' }];
    const current = draftOf(stored) as ExerciseEnrichmentData;
    section(current, 'patient').mistakes = [{ fix: 'Ustaw miednicę równo.', mistake: 'Cudzy błąd.' }];
    section(current, 'patient').step_images = [{ url: 'https://example.test/cudze.png', step: 1 }];

    expect(findV33EditCollisions(sent, draft as ExerciseEnrichmentData, current)).toEqual([
      { path: 'patient.step_images', mine: [{ step: 1, url: 'https://example.test/moje.png' }], theirs: [{ url: 'https://example.test/cudze.png', step: 1 }] },
      { path: 'patient.mistakes', mine: [{ mistake: 'Mój błąd.', fix: 'Ustaw miednicę równo.' }], theirs: [{ fix: 'Ustaw miednicę równo.', mistake: 'Cudzy błąd.' }] },
    ]);
  });

  it('kolejność elementów listy nadal jest zmianą', () => {
    const reordered = draftOf(stored);
    section(reordered, 'patient').mistakes = [...(stored.patient?.mistakes ?? [])].reverse();
    section(reordered, 'patient').step_images = [...(stored.patient?.step_images ?? [])].reverse();

    expect(Object.keys(collectV33Edits(sent, reordered as ExerciseEnrichmentData)).sort()).toEqual([
      'patient.mistakes',
      'patient.step_images',
    ]);
  });

  it('klucz z wartością null to nadal co innego niż brak klucza (stan sprzed poprawki)', () => {
    const withNull = draftOf(sent);
    section(withNull, 'patient').mistakes = [
      { mistake: 'Biodro ucieka w bok.', fix: 'Ustaw miednicę równo.', note: null },
      { mistake: 'Wstrzymany oddech.', fix: 'Oddychaj spokojnie.' },
    ];
    section(withNull, 'patient').step_images = [
      { step: 1, url: 'https://example.test/a.png', alt: null },
      { step: 2, url: 'https://example.test/b.png' },
    ];

    expect(Object.keys(collectV33Edits(sent, withNull as ExerciseEnrichmentData)).sort()).toEqual([
      'patient.mistakes',
      'patient.step_images',
    ]);
    expect(isSameV33Document(sent, withNull as ExerciseEnrichmentData)).toBe(false);
    expect(isSameV33Document(stored, withNull as ExerciseEnrichmentData)).toBe(false);
  });

  it('null kontra brak klucza jest jedyną zmianą także wtedy, gdy baza przestawiła klucze', () => {
    const withNull = draftOf(sent);
    section(withNull, 'patient').mistakes = [
      { mistake: 'Biodro ucieka w bok.', fix: 'Ustaw miednicę równo.', note: null },
      { mistake: 'Wstrzymany oddech.', fix: 'Oddychaj spokojnie.' },
    ];

    expect(Object.keys(collectV33Edits(stored, withNull as ExerciseEnrichmentData))).toEqual(['patient.mistakes']);
  });
});

describe('zapadka kontraktu: każdy liść złotego rekordu 3.3 jest sklasyfikowany', () => {
  function setLeaf(document: Doc, path: string, change: (value: unknown) => unknown): void {
    const keys = path.split('.');
    let target: Record<string, unknown> = document;
    for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
    const last = keys[keys.length - 1];
    target[last] = change(target[last]);
  }

  /** A different value of the same kind, so the change is the kind a screen or an import could make. */
  function changed(value: unknown): unknown {
    if (typeof value === 'string') return `${value} (zmiana)`;
    if (typeof value === 'number') return value + 1;
    if (typeof value === 'boolean') return !value;
    return 'zmiana';
  }

  const classified = GOLDEN_LEAF_PATHS.map((path) => ({ path, classes: classesOfV33Leaf(path) }));
  const leavesOf = (wanted: string) =>
    classified.filter(({ classes }) => classes[0] === wanted).map(({ path }) => [path] as const);

  it('złoty rekord jest rekordem 3.3 i ma liście', () => {
    expect(loaded.schemaVersion).toBe('3.3');
    expect(GOLDEN_LEAF_PATHS.length).toBeGreaterThan(100);
  });

  it('żaden liść nie jest poza klasyfikacją ani w dwóch klasach naraz', () => {
    expect(classified.filter(({ classes }) => classes.length !== 1)).toEqual([]);
  });

  it('nowe pole kontraktu w rekordzie jest niesklasyfikowane, dopóki nikt go nie dopisze', () => {
    const next = draftOf();
    section(next, 'patient').nowe_pole_kontraktu = 'x';
    next.nowa_sekcja = { pole: 1 };

    expect(leafPaths(next).filter((path) => classesOfV33Leaf(path).length === 0)).toEqual([
      'patient.nowe_pole_kontraktu',
      'nowa_sekcja.pole',
    ]);
  });

  it('nowe pole wewnątrz sekcji tylko do odczytu też jest niesklasyfikowane (odbiór 13.11)', () => {
    const next = draftOf();
    section(next, 'provenance').nowe_pole = 'x';
    section(section(next, 'provenance'), 'patient').nowe_pole = 'x';
    (next.media as unknown as Doc[])[1].nowe_pole = 'x';
    (section(next, 'safety').flags as Doc[])[0].nowe_pole = 'x';
    section(section(next, 'prescription'), 'params').nowy_parametr = { default: 1 };

    expect(
      leafPaths(next)
        .filter((path) => classesOfV33Leaf(path).length === 0)
        .sort()
    ).toEqual([
      'media.1.nowe_pole',
      'prescription.params.nowy_parametr.default',
      'provenance.nowe_pole',
      'provenance.patient.nowe_pole',
      'safety.flags.0.nowe_pole',
    ]);
  });

  it('listy „tylko do odczytu” i „pominięte” nie mają martwych wpisów, a każdy wpis ma powód', () => {
    for (const rule of [...V33_READ_ONLY_PATHS, ...V33_SKIPPED_PATHS]) {
      expect(GOLDEN_LEAF_PATHS.some((leaf) => leaf === rule.path || leaf.startsWith(`${rule.path}.`)), rule.path).toBe(true);
      expect(rule.reason.trim().length, rule.path).toBeGreaterThan(10);
    }
  });

  it('każdy liść wpisany jako tylko do odczytu leży w swojej sekcji i istnieje w złotym rekordzie', () => {
    const goldenShapes = new Set(GOLDEN_LEAF_PATHS.map(leafShape));
    for (const rule of V33_READ_ONLY_PATHS) {
      expect(rule.leaves.length, rule.path).toBeGreaterThan(0);
      expect(rule.leaves.filter((leaf) => leaf !== rule.path && !leaf.startsWith(`${rule.path}.`))).toEqual([]);
      expect(rule.leaves.filter((leaf) => !goldenShapes.has(leaf))).toEqual([]);
    }
  });

  it('lista ścieżek edytowalnych to dokładnie: pola ze złotego rekordu plus jawnie nazwane nieobecne w nim', () => {
    const absent = V33_EDITABLE_ABSENT_FROM_GOLDEN.map((rule) => rule.path);

    expect(absent.filter((path) => GOLDEN_EDITABLE_PATHS.includes(path))).toEqual([]);
    expect([...GOLDEN_EDITABLE_PATHS, ...absent].sort()).toEqual([...V33_EDITABLE_PATHS].sort());
    for (const rule of V33_EDITABLE_ABSENT_FROM_GOLDEN) expect(rule.reason.trim().length).toBeGreaterThan(10);
  });

  it.each(leavesOf('editable'))('edytowalny %s: zmiana liścia trafia do zapisu pod swoją ścieżką', (path) => {
    const draft = draftOf();
    setLeaf(draft, path, changed);

    const edits = Object.keys(collectV33Edits(loaded, draft as ExerciseEnrichmentData));

    expect(edits).toContain(editableRootOf(path));
  });

  it.each(leavesOf('read-only'))('tylko do odczytu %s: zmiana w szkicu nie trafia do zapisu', (path) => {
    const draft = draftOf();
    setLeaf(draft, path, changed);

    expect(collectV33Edits(loaded, draft as ExerciseEnrichmentData)).toEqual({});
    expect(save(draft)).toEqual(loaded);
  });
});
