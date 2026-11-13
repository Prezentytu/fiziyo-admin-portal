import { describe, expect, it } from 'vitest';

import { describeEquipmentItem } from '../equipmentItemText';

const base = { label: 'taśma', code: 'band', qty: 1, required: true, substitutes: [] };

describe('describeEquipmentItem', () => {
  it('liczbę sztuk dopisuje dopiero powyżej jednej', () => {
    expect(describeEquipmentItem(base).name).toBe('taśma');
    expect(describeEquipmentItem({ ...base, qty: null }).name).toBe('taśma');
    expect(describeEquipmentItem({ ...base, qty: 2 }).name).toBe('taśma × 2');
  });

  it('rozróżnia sprzęt wymagany, opcjonalny i bez tej informacji', () => {
    expect(describeEquipmentItem(base).requirement).toBe('wymagany');
    expect(describeEquipmentItem({ ...base, required: false }).requirement).toBe('opcjonalny');
    expect(describeEquipmentItem({ ...base, required: null }).requirement).toBeNull();
  });

  it('zamienniki skleja przecinkiem, a pustą listę pomija', () => {
    expect(describeEquipmentItem(base).substitutes).toBeNull();
    expect(describeEquipmentItem({ ...base, substitutes: ['ręcznik', 'pasek'] }).substitutes).toBe('ręcznik, pasek');
  });
});
