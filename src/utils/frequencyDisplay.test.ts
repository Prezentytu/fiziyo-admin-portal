import { describe, expect, it } from 'vitest';

import { formatFrequencyDisplay } from './frequencyDisplay';

describe('formatFrequencyDisplay', () => {
  it('zwraca brak harmonogramu dla undefined', () => {
    expect(formatFrequencyDisplay()).toBe('Brak harmonogramu');
  });

  it('pokazuje rekomendacje tygodniowa dla elastycznego harmonogramu', () => {
    expect(
      formatFrequencyDisplay({
        timesPerWeek: 3,
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      })
    ).toBe('3 razy w tygodniu');
  });

  it('pokazuje skrot wybranych dni', () => {
    expect(
      formatFrequencyDisplay({
        monday: true,
        wednesday: true,
        friday: true,
      })
    ).toBe('Pn, Śr, Pt');
  });

  it('pokazuje Pn-Pt dla dni roboczych', () => {
    expect(
      formatFrequencyDisplay({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
      })
    ).toBe('Pn-Pt');
  });

  it('pokazuje codziennie dla 7 dni', () => {
    expect(
      formatFrequencyDisplay({
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      })
    ).toBe('Codziennie');
  });
});
