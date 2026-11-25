import { describe, expect, it } from 'vitest';

import type { ExerciseSetLogEntry } from '@/graphql/types/exerciseSetLog.types';

import {
  allowedSetNoteVisibilities,
  describeSetContentChange,
  setLogAuthorLabel,
  sortSetLogNewestFirst,
} from './setLog';

const entry = (id: string, createdAt: string): ExerciseSetLogEntry => ({
  id,
  exerciseSetId: 'set-1',
  kind: 'NOTE',
  authorRole: 'THERAPIST',
  authorName: 'Anna',
  isMine: false,
  source: null,
  body: id,
  data: null,
  visibility: 'ORGANIZATION',
  createdAt,
  updatedAt: null,
});

describe('allowedSetNoteVisibilities', () => {
  it('daje personelowi gabinet albo prywatnie, nigdy wszystkich fizjo', () => {
    expect(allowedSetNoteVisibilities({ isFiziyoTeam: false, isGlobalTemplate: true })).toEqual([
      'ORGANIZATION',
      'PRIVATE',
    ]);
  });

  it('daje zespołowi FiziYo wszystkich fizjo tylko na szablonie FiziYo', () => {
    expect(allowedSetNoteVisibilities({ isFiziyoTeam: true, isGlobalTemplate: true })).toEqual([
      'FIZIYO_ADMINS',
      'ALL_THERAPISTS',
      'PRIVATE',
    ]);
    expect(allowedSetNoteVisibilities({ isFiziyoTeam: true, isGlobalTemplate: false })).toEqual([
      'FIZIYO_ADMINS',
      'ORGANIZATION',
      'PRIVATE',
    ]);
  });
});

describe('describeSetContentChange', () => {
  const exerciseNames = new Map([
    ['ex-1', 'Most biodrowy'],
    ['ex-2', 'Kot-krowa'],
  ]);

  it('opisuje dawki z nazwą ćwiczenia, a dodane i usunięte po nazwach', () => {
    const data = JSON.stringify({
      fields: { name: { before: 'Plecy', after: 'Zdrowe plecy' }, description: { before: null, after: 'x' } },
      items: { 'm-1': { exerciseId: 'ex-1', fields: { reps: { before: 10, after: 15 }, restSets: { before: 60, after: null } } } },
      added: ['ex-2'],
      removed: ['ex-gone'],
    });

    expect(describeSetContentChange(data, exerciseNames)).toEqual([
      'Nazwa: Plecy → Zdrowe plecy',
      'Zmieniony opis',
      'Dodane: Kot-krowa',
      'Usunięte: ćwiczenie spoza zestawu',
      'Most biodrowy: powtórzenia: 10 → 15, przerwa między seriami: 60 s → —',
    ]);
  });

  it('pole bez wartości do pokazania opisuje samą nazwą, a nieznane pomija', () => {
    const data = JSON.stringify({
      items: { 'm-1': { exerciseId: 'ex-1', fields: { overridesJson: { before: '{}', after: '{"side":"left"}' }, mystery: {} } } },
    });
    expect(describeSetContentChange(data, exerciseNames)).toEqual(['Most biodrowy: ustawienia ćwiczenia']);
  });

  it('zwraca pustą listę dla braku danych i zepsutego JSON', () => {
    expect(describeSetContentChange(null, exerciseNames)).toEqual([]);
    expect(describeSetContentChange('{', exerciseNames)).toEqual([]);
  });
});

describe('setLogAuthorLabel i kolejność', () => {
  it('własny wpis to „Ty”, cudzy nazwą z backendu', () => {
    expect(setLogAuthorLabel({ ...entry('a', '2026-11-25T10:00:00Z'), isMine: true })).toBe('Ty');
    expect(setLogAuthorLabel(entry('a', '2026-11-25T10:00:00Z'))).toBe('Anna');
  });

  it('układa od najnowszego', () => {
    const sorted = sortSetLogNewestFirst([entry('stary', '2026-11-20T10:00:00Z'), entry('nowy', '2026-11-25T10:00:00Z')]);
    expect(sorted.map((e) => e.id)).toEqual(['nowy', 'stary']);
  });
});
