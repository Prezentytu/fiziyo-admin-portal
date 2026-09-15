import { describe, expect, it } from 'vitest';

import { getExecutionTimeFieldHint } from '../executionTimeFieldHint';

describe('getExecutionTimeFieldHint', () => {
  it('nie każe „podać czasu powtórzenia” poza kontekstem pola', () => {
    expect(getExecutionTimeFieldHint(false)).toContain('Wpisz sekundy tutaj');
    expect(getExecutionTimeFieldHint(false)).not.toMatch(/Podaj/i);
  });
});
