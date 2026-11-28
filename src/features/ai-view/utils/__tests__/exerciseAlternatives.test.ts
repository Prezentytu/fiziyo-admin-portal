import { describe, expect, it } from 'vitest';

import { alternativeSearchTerm, findAlternatives, requiresSpecializedEquipment } from '../exerciseAlternatives';

const SQUAT = { id: 'squat', name: 'Przysiad', mainTags: [{ name: 'Kolano' }], additionalTags: ['Siła'] };
const POOL = [
  SQUAT,
  { id: 'lunge', name: 'Wykrok', mainTags: [{ name: 'kolano' }], additionalTags: ['siła'] },
  { id: 'bridge', name: 'Mostek', mainTags: ['Biodro'], additionalTags: ['Siła'] },
  { id: 'step', name: 'Wejście na stopień', mainTags: ['Kolano'] },
  { id: 'neck', name: 'Retrakcja szyi', mainTags: ['Szyja'] },
];

describe('findAlternatives', () => {
  it('ranks shared main tags above additional ones, case-insensitively', () => {
    expect(findAlternatives(SQUAT, POOL, []).map((exercise) => exercise.id)).toEqual(['lunge', 'step', 'bridge']);
  });

  it('never returns the exercise itself or ones already in the draft', () => {
    expect(findAlternatives(SQUAT, POOL, ['lunge']).map((exercise) => exercise.id)).toEqual(['step', 'bridge']);
  });

  it('returns nothing for an exercise without tags or meaningful clinical terms', () => {
    expect(findAlternatives({ id: 'x', name: 'X' }, POOL, [])).toEqual([]);
  });

  // SPEC-069 / W6: katalog bez tagów nadal znajduje 3 sensowne zamienniki po okolicy anatomicznej i rdzeniach nazwy.
  it('finds 3 sensible alternatives for an untagged exercise by anatomical region and name stems', () => {
    const source = { id: 'src', name: 'Mostek biodrowy z piętą na krześle', mainTags: [], additionalTags: [] };
    const catalog = [
      source,
      { id: 'hip-1', name: 'Unoszenie bioder w leżeniu tyłem', mainTags: [] },
      { id: 'hip-2', name: 'Clamshell — odwodzenie biodra bokiem', mainTags: [] },
      { id: 'hip-3', name: 'Mostek na jednej nodze', mainTags: [] },
      { id: 'neck-1', name: 'Retrakcja szyi przy ścianie', mainTags: [] },
      { id: 'wrist-1', name: 'Zginanie nadgarstka', mainTags: [] },
    ];

    const result = findAlternatives(source, catalog, []);
    expect(result).toHaveLength(3);
    expect(result.map((exercise) => exercise.id)).toEqual(expect.arrayContaining(['hip-1', 'hip-2', 'hip-3']));
    expect(result.map((exercise) => exercise.id)).not.toContain('neck-1');
  });

  it('prefers equipment-compatible and accepted exercises over specialized-equipment or in-review ones', () => {
    const source = { id: 'src', name: 'Mostek biodrowy na krześle', equipment: 'krzesło' };
    const catalog = [
      source,
      {
        id: 'with-band',
        name: 'Mostek biodrowy z gumą oporową',
        equipment: 'guma oporowa miniband',
        scope: 'GLOBAL',
      },
      {
        id: 'pending-review',
        name: 'Mostek biodrowy z podparciem',
        equipment: 'krzesło',
        scope: 'ORGANIZATION',
        status: 'PENDING_REVIEW',
      },
      {
        id: 'verified-bodyweight',
        name: 'Mostek biodrowy obunóż',
        equipment: 'brak',
        scope: 'GLOBAL',
      },
    ];

    const result = findAlternatives(source, catalog, []);
    expect(result.map((exercise) => exercise.id)).toEqual(['verified-bodyweight', 'pending-review', 'with-band']);
  });
});

describe('requiresSpecializedEquipment', () => {
  it('distinguishes household props from specialized rehabilitation gear', () => {
    expect(requiresSpecializedEquipment('krzesło, ściana, poduszka')).toBe(false);
    expect(requiresSpecializedEquipment('mata')).toBe(false);
    expect(requiresSpecializedEquipment('guma miniband')).toBe(true);
    expect(requiresSpecializedEquipment('poduszka sensomotoryczna')).toBe(true);
    expect(requiresSpecializedEquipment('hantle 2 kg')).toBe(true);
  });
});

describe('alternativeSearchTerm', () => {
  it('picks the first tag or anatomical stem and returns null when none exists', () => {
    expect(alternativeSearchTerm(SQUAT)).toBe('kolano');
    expect(alternativeSearchTerm({ id: 'u1', name: 'Mostek biodrowy na jednej nodze' })).toBe('mostek');
    expect(alternativeSearchTerm({ id: 'x', name: 'X' })).toBeNull();
  });
});
