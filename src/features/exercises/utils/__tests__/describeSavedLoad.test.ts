import { describe, expect, it } from 'vitest';

import { describeSavedNonKgLoad, readSavedLoadKg } from '../describeSavedLoad';

describe('describeSavedNonKgLoad', () => {
  it('pokazuje obciążenie, którego pole kilogramów nie zmieści', () => {
    expect(describeSavedNonKgLoad({ defaultLoad: { type: 'band', text: 'guma czerwona' } })).toBe('guma czerwona');
    expect(describeSavedNonKgLoad({ defaultLoad: { type: 'rpe', value: 7, unit: 'RPE' } })).toBe('7 RPE');
    expect(describeSavedNonKgLoad({ defaultLoad: { type: 'weight', value: 10, unit: 'lbs', text: '10 lbs' } })).toBe(
      '10 lbs'
    );
  });

  it('pomija kilogramy i brak obciążenia', () => {
    expect(describeSavedNonKgLoad({ defaultLoad: { loadWeightKg: 5, text: '5 kg' } })).toBeNull();
    expect(describeSavedNonKgLoad({ defaultLoad: { type: 'weight', value: 5 } })).toBeNull();
    expect(describeSavedNonKgLoad({ defaultLoad: { type: 'weight', value: 5, unit: 'kg' } })).toBeNull();
    expect(describeSavedNonKgLoad({ loadValue: 3, loadUnit: 'kg' })).toBeNull();
    expect(describeSavedNonKgLoad({ defaultLoad: null })).toBeNull();
    expect(describeSavedNonKgLoad(null)).toBeNull();
  });

  it('funtów nie wkłada do pola kilogramów', () => {
    expect(readSavedLoadKg({ defaultLoad: { type: 'weight', value: 10, unit: 'lbs' } })).toBeNull();
    expect(readSavedLoadKg({ defaultLoad: { type: 'weight', value: 5 } })).toBe(5);
    expect(readSavedLoadKg({ defaultLoad: { loadWeightKg: 4.5, unit: 'lbs', value: 10 } })).toBe(4.5);
  });
});
