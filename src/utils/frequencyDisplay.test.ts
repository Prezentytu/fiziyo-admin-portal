import { describe, expect, it } from 'vitest';

import { formatFrequencyDisplay, formatScheduleShort, formatScheduleStat } from './frequencyDisplay';

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

describe('formatScheduleShort', () => {
  it('dopisuje sesje dzienne tylko powyżej jednej', () => {
    expect(formatScheduleShort({ timesPerWeek: '3', timesPerDay: '1' })).toBe('3 razy w tygodniu');
    expect(formatScheduleShort({ timesPerWeek: 7, timesPerDay: 2 })).toBe('7 razy w tygodniu · 2× dziennie');
  });

  it('bez harmonogramu mówi to wprost', () => {
    expect(formatScheduleShort(undefined)).toBe('Brak harmonogramu');
  });
});

describe('formatScheduleStat', () => {
  it('tryb elastyczny: liczba z celu tygodniowego', () => {
    expect(formatScheduleStat({ timesPerWeek: '3', timesPerDay: '1' })).toEqual({
      value: '3×',
      label: 'w tygodniu · 1× dziennie',
    });
  });

  it('wybrane dni: liczba z dni i ich skróty', () => {
    expect(formatScheduleStat({ timesPerWeek: 3, timesPerDay: 2, monday: true, thursday: true })).toEqual({
      value: '2×',
      label: 'Pn, Cz · 2× dziennie',
    });
  });

  it('brak harmonogramu', () => {
    expect(formatScheduleStat(undefined)).toEqual({ value: '—', label: 'w tygodniu' });
  });
});
