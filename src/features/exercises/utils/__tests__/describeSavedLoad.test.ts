import { describe, expect, it } from 'vitest';

import { describeSavedNonKgLoad } from '../describeSavedLoad';

describe('describeSavedNonKgLoad', () => {
  it('pokazuje obciążenie, którego pole kilogramów nie zmieści', () => {
    expect(describeSavedNonKgLoad({ defaultLoad: { type: 'band', text: 'guma czerwona' } })).toBe('guma czerwona');
    expect(describeSavedNonKgLoad({ defaultLoad: { type: 'rpe', value: 7, unit: 'RPE' } })).toBe('7 RPE');
  });

  it('pomija kilogramy i brak obciążenia', () => {
    expect(describeSavedNonKgLoad({ defaultLoad: { loadWeightKg: 5, text: '5 kg' } })).toBeNull();
    expect(describeSavedNonKgLoad({ defaultLoad: { type: 'weight', value: 5 } })).toBeNull();
    expect(describeSavedNonKgLoad({ loadValue: 3, loadUnit: 'kg' })).toBeNull();
    expect(describeSavedNonKgLoad({ defaultLoad: null })).toBeNull();
    expect(describeSavedNonKgLoad(null)).toBeNull();
  });
});
