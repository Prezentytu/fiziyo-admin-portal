import { describe, expect, it } from 'vitest';

import {
  applyParameterPatch,
  draftItemFromMapping,
  draftNote,
  planNote,
  draftMinutes,
  itemSeconds,
  formatDraftParams,
  scheduleQuestion,
  toMappingInput,
  proposeDraftName,
  itemsToDoses,
  applyDose,
  MAX_SET_DESCRIPTION_LENGTH,
  proposeDraftDescription,
  type DraftItem,
} from '../setDraft';

const ITEM: DraftItem = {
  exerciseId: 'e1',
  sets: 3,
  reps: 10,
  duration: 0,
  executionTime: 3,
  restSets: 60,
  restReps: 0,
  preparationTime: 0,
};

describe('draftItemFromMapping', () => {
  it('lets the catalog set mapping win over exercise defaults', () => {
    const item = draftItemFromMapping(
      { exerciseId: 'e1', sets: 4, reps: null },
      { id: 'e1', defaultSets: 2, defaultReps: 12 }
    );
    expect(item.sets).toBe(4);
    expect(item.reps).toBe(12);
  });
  it("keeps the catalog set's tempo, notes and load", () => {
    expect(
      draftItemFromMapping({ exerciseId: 'e1', tempo: '2-0-2', notes: 'Bez bólu', load: { loadWeightKg: 3 } })
    ).toMatchObject({ tempo: '2-0-2', notes: 'Bez bólu', loadKg: 3 });
  });
});

describe('draftMinutes', () => {
  it('is zero for an empty draft and rounds a whole set up', () => {
    expect(draftMinutes([])).toBe(0);
    expect(draftMinutes([ITEM])).toBeGreaterThanOrEqual(1);
    expect(draftMinutes([ITEM, { ...ITEM, exerciseId: 'e2' }])).toBeGreaterThanOrEqual(draftMinutes([ITEM]));
  });
});

describe('formatDraftParams', () => {
  it('shows series, repetition time and rest', () => {
    expect(formatDraftParams(ITEM)).toBe('3 × 10 · 3 s powtórzenie · przerwa 60 s');
  });

  it('shows a held series as time', () => {
    expect(formatDraftParams({ ...ITEM, reps: 1, duration: 30, restSets: 0 })).toBe('3 × 30 s');
    expect(formatDraftParams({ ...ITEM, reps: 1, duration: 0, executionTime: 30, restSets: 0 })).toBe('3 × 30 s');
  });
});

describe('proposeDraftName', () => {
  it('uses the set name or topic, never the patient', () => {
    expect(proposeDraftName({ setName: 'Kolano · faza 2' })).toBe('Kolano · faza 2');
    const today = new Date(2026, 10, 4);
    expect(proposeDraftName({ topic: 'bark po urazie', today })).toBe('Bark po urazie · 04.11');
    expect(proposeDraftName({ topic: 'Zestaw na ból karku', today })).toBe('Ból karku · 04.11');
    expect(proposeDraftName({ today })).toBe('Nowy zestaw · 04.11');
  });

  it('never carries the person a model note is about, only what the set is for', () => {
    const today = new Date(2026, 10, 17);
    expect(proposeDraftName({ topic: 'Szkic dla Lab pacjent przy utykaniu na nogę', today })).toBe(
      'Przy utykaniu na nogę · 17.11'
    );
    expect(proposeDraftName({ topic: 'Zestaw dla Jarka', today })).toBe('Nowy zestaw · 17.11');
    expect(proposeDraftName({ topic: 'Pacjent z utykaniem, bez rozpoznania; zestaw ogólny do korekty', today })).toBe(
      'Z utykaniem · 17.11'
    );
  });

  it('drops a topic that names a person from the thread', () => {
    const today = new Date(2026, 10, 4);
    expect(proposeDraftName({ topic: 'Zestaw dla Anny Kowalskiej', avoid: ['Anna Kowalska'], today })).toBe(
      'Nowy zestaw · 04.11'
    );
  });

  it('keeps the name within 80 characters', () => {
    expect(proposeDraftName({ topic: 'x'.repeat(100) })).toHaveLength(80);
  });
});

describe('proposeDraftDescription', () => {
  it('says only what the set is for: no exercises, daily time or date', () => {
    const text = proposeDraftDescription({ topic: 'Zestaw na ból karku' });
    expect(text).toBe('Ból karku.');
    expect(text).not.toMatch(/Ćwiczenia:|min dziennie|w czacie|\d{2}\.\d{2}\.\d{4}/);
  });

  it('is empty without a topic or when the topic names the patient', () => {
    expect(proposeDraftDescription({})).toBe('');
    expect(proposeDraftDescription({ topic: 'dla Anny Kowalskiej', avoid: ['Anna Kowalska'] })).toBe('');
  });

  it('keeps within the 300-character column', () => {
    expect(proposeDraftDescription({ topic: 'x'.repeat(400) }).length).toBeLessThanOrEqual(MAX_SET_DESCRIPTION_LENGTH);
  });
});

describe('scheduleQuestion', () => {
  it("proposes the default plan with the set's daily minutes", () => {
    expect(scheduleQuestion([ITEM])).toBe(
      `Od kiedy i jak często? Proponuję od jutra, przez 2 tygodnie, codziennie (ok. ${draftMinutes([ITEM])} min dziennie).`
    );
  });
});

describe('applyParameterPatch', () => {
  it("takes the shared parameter editor's patch, cleared numbers become 0", () => {
    expect(applyParameterPatch(ITEM, { reps: 12, restSets: null, tempo: '3-1-1', loadKg: 5, notes: 'Wolno' })).toEqual({
      ...ITEM,
      reps: 12,
      restSets: 0,
      tempo: '3-1-1',
      loadKg: 5,
      notes: 'Wolno',
    });
  });
});

describe('toMappingInput', () => {
  it('sends tempo, load and notes with the numbers', () => {
    expect(toMappingInput({ ...ITEM, tempo: '3-1-1', loadKg: 5, notes: 'Wolno' })).toMatchObject({
      exerciseId: 'e1',
      reps: 10,
      tempo: '3-1-1',
      loadWeightKg: 5,
      notes: 'Wolno',
    });
  });
});

describe('draftNote and planNote', () => {
  it('calls only a draft started from a catalog set a catalog set', () => {
    expect(draftNote({ fromCatalog: true, hasPatient: true })).toContain('Zestaw z katalogu');
    expect(planNote(true)).toContain('kopia zestawu');
    for (const hasPatient of [true, false]) {
      expect(draftNote({ fromCatalog: false, hasPatient })).not.toMatch(/z katalogu|zalecenie dla tej osoby/);
    }
    expect(planNote(false)).not.toContain('kopia zestawu');
  });

  it('speaks of a person only once there is a patient', () => {
    expect(draftNote({ fromCatalog: true, hasPatient: false })).not.toContain('tej osoby');
    expect(draftNote({ fromCatalog: false, hasPatient: true })).toContain('tylko dla tego pacjenta');
  });
});

describe('itemSeconds: wersja rekordu', () => {
  const alternating: DraftItem = {
    ...ITEM,
    side: 'alternating',
    restSets: 30,
    restReps: 2,
    preparationTime: 5,
  };

  it('rekord 3.3 liczy „naprzemiennie” na stronę (359 s), bez flagi łącznie (209 s)', () => {
    expect(itemSeconds({ ...alternating, alternatingPerSide: true })).toBe(359);
    expect(itemSeconds(alternating)).toBe(209);
    expect(itemSeconds({ ...alternating, alternatingPerSide: false })).toBe(209);
  });

  it('flaga nie zmienia innych stron', () => {
    expect(itemSeconds({ ...alternating, side: 'both', alternatingPerSide: true })).toBe(
      itemSeconds({ ...alternating, side: 'both' })
    );
  });
});

describe('itemsToDoses', () => {
  it('keeps sets and reps, and a hold as its time, so the rebuilt draft matches', () => {
    const held = { ...ITEM, exerciseId: 'e2', sets: 2, reps: 1, executionTime: 30 };
    const doses = itemsToDoses([ITEM, held]);
    expect(doses).toEqual({ e1: { sets: 3, reps: 10 }, e2: { sets: 2, duration: 30 } });
    expect(applyDose({ ...held, sets: 5, executionTime: 0 }, doses.e2)).toMatchObject({
      sets: 2,
      reps: 1,
      executionTime: 30,
    });
  });
});
