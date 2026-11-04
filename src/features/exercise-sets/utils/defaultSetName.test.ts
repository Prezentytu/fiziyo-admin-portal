import { describe, expect, it } from 'vitest';

import { defaultSetName } from './defaultSetName';

describe('defaultSetName', () => {
  it('opens the editor for a patient without the patient name in the set name', () => {
    const name = defaultSetName({ forPatient: true, today: new Date(2026, 10, 4) });

    expect(name).toBe('Nowy zestaw · 04.11');
    expect(name).not.toMatch(/dla/i);
  });

  it('leaves the name empty when the editor opens without a patient', () => {
    expect(defaultSetName({ forPatient: false })).toBe('');
  });
});
