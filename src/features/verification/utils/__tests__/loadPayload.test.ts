import { describe, expect, it } from 'vitest';

import { buildDefaultLoadUpdate, resolveLoadPreset } from '../loadPayload';

describe('loadPayload helpers', () => {
  it('mapuje preset guma do backendowego modelu ExerciseLoad', () => {
    const payload = buildDefaultLoadUpdate('band', '3', '');

    expect(payload).toEqual({
      type: 'band',
      value: 3,
      unit: 'level',
      text: 'Guma oporowa',
    });
  });

  it('mapuje preset kg do weight+kg', () => {
    const payload = buildDefaultLoadUpdate('kg', '12.5', 'Hantle');

    expect(payload).toEqual({
      type: 'weight',
      value: 12.5,
      unit: 'kg',
      text: 'Hantle',
    });
  });

  it('odczytuje preset z defaultLoad', () => {
    expect(
      resolveLoadPreset({
        defaultLoad: {
          type: 'weight',
          unit: 'lbs',
          text: 'Dumbbell',
        },
      })
    ).toBe('lb');

    expect(
      resolveLoadPreset({
        defaultLoad: {
          type: 'band',
          unit: 'level',
          text: 'Guma',
        },
      })
    ).toBe('band');
  });
});
