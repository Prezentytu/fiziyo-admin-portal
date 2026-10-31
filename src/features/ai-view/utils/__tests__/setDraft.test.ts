import { describe, expect, it } from 'vitest';

import {
  applyParameterPatch,
  draftItemFromMapping,
  draftNote,
  planNote,
  draftMinutes,
  formatDraftParams,
  scheduleQuestion,
  toMappingInput,
  proposeDraftName,
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
  });
});

describe('proposeDraftName', () => {
  it('uses the set name or topic, then the patient', () => {
    expect(proposeDraftName({ setName: 'Kolano · faza 2', patientName: 'Jan Kowalski' })).toBe(
      'Kolano · faza 2 · Jan Kowalski'
    );
    expect(proposeDraftName({ topic: 'bark po urazie' })).toBe('Bark po urazie');
    expect(proposeDraftName({})).toBe('Nowy zestaw');
  });

  it('keeps the name within 80 characters', () => {
    expect(proposeDraftName({ topic: 'x'.repeat(100) })).toHaveLength(80);
  });
});

describe('scheduleQuestion', () => {
  it("proposes the default plan with the set's daily minutes", () => {
    expect(scheduleQuestion([ITEM])).toBe(
      `Od kiedy i jak często? Proponuję od jutra, przez 4 tygodnie, codziennie (ok. ${draftMinutes([ITEM])} min dziennie).`
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
