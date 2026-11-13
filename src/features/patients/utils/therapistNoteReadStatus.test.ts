import { describe, expect, it } from 'vitest';
import {
  buildTherapistNoteStampIndex,
  overrideEntryHasNotes,
  resolveTherapistNoteReadState,
} from './therapistNoteReadStatus';

const UPDATED = '2026-11-13T08:00:00.000Z';

describe('resolveTherapistNoteReadState', () => {
  it('nic nie pokazuje dla pustej uwagi, uwagi sprzed znaczników i uwagi z nadpisania', () => {
    expect(resolveTherapistNoteReadState({ notesUpdatedAt: UPDATED }, { noteText: '  ' })).toBeNull();
    expect(resolveTherapistNoteReadState({ notesUpdatedAt: null }, { noteText: 'Wolno' })).toBeNull();
    expect(
      resolveTherapistNoteReadState({ notesUpdatedAt: UPDATED }, { noteText: 'Wolno', overrideHasNotes: true })
    ).toBeNull();
  });

  it('nieprzeczytana, gdy pacjent nie potwierdził tej albo późniejszej wersji', () => {
    expect(resolveTherapistNoteReadState({ notesUpdatedAt: UPDATED, notesSeenAt: null }, { noteText: 'Wolno' })).toEqual({
      kind: 'unread',
    });
    expect(
      resolveTherapistNoteReadState(
        { notesUpdatedAt: '2026-11-13T09:00:00.000Z', notesSeenAt: UPDATED },
        { noteText: 'Wolno' }
      )
    ).toEqual({ kind: 'unread' });
  });

  it('przeczytana z datą potwierdzenia', () => {
    expect(resolveTherapistNoteReadState({ notesUpdatedAt: UPDATED, notesSeenAt: UPDATED }, { noteText: 'Wolno' })).toEqual({
      kind: 'read',
      seenAt: UPDATED,
    });
  });
});

describe('buildTherapistNoteStampIndex', () => {
  it('indeksuje plan po przypisaniu i uwagi po pozycji, pomija wiersze bez id', () => {
    const index = buildTherapistNoteStampIndex([
      {
        id: 'a-1',
        notesUpdatedAt: UPDATED,
        notesSeenAt: null,
        exerciseSet: { exerciseMappings: [{ id: 'm-1', notesUpdatedAt: UPDATED, notesSeenAt: UPDATED }, null, { id: null }] },
      },
      null,
      { id: null },
    ]);
    expect(index.plans.get('a-1')).toEqual({ notesUpdatedAt: UPDATED, notesSeenAt: null });
    expect(index.mappings.get('m-1')).toEqual({ notesUpdatedAt: UPDATED, notesSeenAt: UPDATED });
    expect(index.plans.size).toBe(1);
    expect(index.mappings.size).toBe(1);
  });
});

describe('overrideEntryHasNotes', () => {
  it('czyta ten sam wpis co aplikacja: najpierw pod id pozycji, potem pod id ćwiczenia', () => {
    expect(overrideEntryHasNotes({ 'm-1': { notes: null } }, { id: 'm-1', exerciseId: 'ex-1' })).toBe(true);
    expect(overrideEntryHasNotes({ 'ex-1': { notes: 'Stara' } }, { id: 'm-1', exerciseId: 'ex-1' })).toBe(true);
    // Wpis pod id pozycji bez `notes` zasłania starszy wpis pod id ćwiczenia.
    expect(overrideEntryHasNotes({ 'm-1': { sets: 3 }, 'ex-1': { notes: 'Stara' } }, { id: 'm-1', exerciseId: 'ex-1' })).toBe(
      false
    );
    expect(overrideEntryHasNotes({}, { id: 'm-1', exerciseId: 'ex-1' })).toBe(false);
  });
});
